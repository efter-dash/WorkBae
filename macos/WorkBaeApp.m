#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>

@interface WorkBaeDelegate : NSObject <NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate>
@property(nonatomic, strong) NSWindow *window;
@property(nonatomic, strong) WKWebView *webView;
@end

@implementation WorkBaeDelegate

- (void)sendJavaScriptEvent:(NSString *)function payload:(NSDictionary *)payload {
    NSData *data = [NSJSONSerialization dataWithJSONObject:payload options:0 error:nil];
    NSString *json = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] ?: @"{}";
    NSString *script = [NSString stringWithFormat:@"window.%@(%@)", function, json];
    dispatch_async(dispatch_get_main_queue(), ^{ [self.webView evaluateJavaScript:script completionHandler:nil]; });
}

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    NSRect frame = NSMakeRect(0, 0, 1240, 780);
    self.window = [[NSWindow alloc] initWithContentRect:frame
                                             styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable | NSWindowStyleMaskResizable
                                               backing:NSBackingStoreBuffered
                                                 defer:NO];
    self.window.title = @"WorkBae";
    self.window.minSize = NSMakeSize(980, 650);
    self.window.titlebarAppearsTransparent = YES;
    self.window.titleVisibility = NSWindowTitleHidden;
    self.window.backgroundColor = [NSColor colorWithRed:0.055 green:0.067 blue:0.063 alpha:1.0];

    WKWebViewConfiguration *configuration = [[WKWebViewConfiguration alloc] init];
    configuration.websiteDataStore = [WKWebsiteDataStore defaultDataStore];
    [configuration.userContentController addScriptMessageHandler:self name:@"daybook"];
    self.webView = [[WKWebView alloc] initWithFrame:frame configuration:configuration];
    self.webView.navigationDelegate = self;
    self.webView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    self.webView.underPageBackgroundColor = [NSColor clearColor];
    [self.webView setValue:@NO forKey:@"drawsBackground"];
    self.window.contentView = self.webView;

    NSURL *webRoot = [[NSBundle mainBundle].resourceURL URLByAppendingPathComponent:@"web"];
    NSURL *indexURL = [webRoot URLByAppendingPathComponent:@"index.html"];
    [self.webView loadFileURL:indexURL allowingReadAccessToURL:webRoot];

    [self.window center];
    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender { return YES; }

- (void)userContentController:(WKUserContentController *)userContentController didReceiveScriptMessage:(WKScriptMessage *)message {
    if (![message.name isEqualToString:@"daybook"] || ![message.body isKindOfClass:[NSDictionary class]]) return;
    NSDictionary *payload = (NSDictionary *)message.body;
    NSString *action = payload[@"action"];

    if ([action isEqualToString:@"importChat"]) {
        NSOpenPanel *panel = [NSOpenPanel openPanel];
        panel.title = @"Choose an exported WhatsApp chat";
        panel.message = @"Select the _chat.txt file from a WhatsApp export.";
        panel.prompt = @"Import Chat";
        panel.canChooseDirectories = NO;
        panel.allowsMultipleSelection = YES;
        panel.allowedContentTypes = @[UTTypePlainText];
        [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse result) {
            if (result != NSModalResponseOK) return;
            for (NSURL *url in panel.URLs) {
                NSError *error = nil;
                NSString *content = [NSString stringWithContentsOfURL:url encoding:NSUTF8StringEncoding error:&error];
                if (!content) {
                    content = [NSString stringWithContentsOfURL:url usedEncoding:nil error:&error];
                }
                if (!content) continue;
                NSArray *arguments = @[url.lastPathComponent ?: @"Imported chat", content];
                NSData *jsonData = [NSJSONSerialization dataWithJSONObject:arguments options:0 error:nil];
                NSString *json = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
                NSString *script = [NSString stringWithFormat:@"window.workBaeNativeImport.apply(null, %@)", json];
                [self.webView evaluateJavaScript:script completionHandler:nil];
            }
        }];
        return;
    }

    if ([action isEqualToString:@"checkLocalAI"]) {
        NSURL *url = [NSURL URLWithString:@"http://127.0.0.1:11434/api/tags"];
        NSURLSessionDataTask *task = [[NSURLSession sharedSession] dataTaskWithURL:url completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
            NSHTTPURLResponse *http = (NSHTTPURLResponse *)response;
            if (error || http.statusCode < 200 || http.statusCode >= 300) {
                [self sendJavaScriptEvent:@"workBaeAIStatus" payload:@{@"ok": @NO, @"message": @"Ollama is not running on this Mac."}];
                return;
            }
            NSDictionary *result = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
            NSArray *models = result[@"models"] ?: @[];
            NSMutableArray *names = [NSMutableArray array];
            for (NSDictionary *model in models) if (model[@"name"]) [names addObject:model[@"name"]];
            [self sendJavaScriptEvent:@"workBaeAIStatus" payload:@{@"ok": @YES, @"message": @"Local AI is ready.", @"models": names}];
        }];
        [task resume];
        return;
    }

    if ([action isEqualToString:@"summarizeLocalAI"]) {
        NSString *model = payload[@"model"] ?: @"qwen3:1.7b";
        NSString *prompt = payload[@"prompt"] ?: @"";
        NSURL *url = [NSURL URLWithString:@"http://127.0.0.1:11434/api/chat"];
        NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
        request.HTTPMethod = @"POST";
        [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
        NSDictionary *body = @{
            @"model": model,
            @"stream": @NO,
            @"think": @NO,
            @"keep_alive": @"0",
            @"format": @"json",
            @"messages": @[
                @{@"role": @"system", @"content": @"You create accurate professional work logs from mixed Bangla and English workplace chats. Never invent work. Return valid JSON only."},
                @{@"role": @"user", @"content": prompt}
            ],
            @"options": @{@"temperature": @0.15, @"num_ctx": @4096}
        };
        request.HTTPBody = [NSJSONSerialization dataWithJSONObject:body options:0 error:nil];
        NSURLSessionDataTask *task = [[NSURLSession sharedSession] dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
            NSHTTPURLResponse *http = (NSHTTPURLResponse *)response;
            if (error || http.statusCode < 200 || http.statusCode >= 300 || !data) {
                NSString *message = error.localizedDescription ?: @"The local model did not respond. Confirm that the model is downloaded.";
                [self sendJavaScriptEvent:@"workBaeAIResult" payload:@{@"ok": @NO, @"message": message}];
                return;
            }
            NSDictionary *result = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
            NSString *content = result[@"message"][@"content"];
            if (!content) {
                [self sendJavaScriptEvent:@"workBaeAIResult" payload:@{@"ok": @NO, @"message": @"The local model returned an unreadable response."}];
                return;
            }
            [self sendJavaScriptEvent:@"workBaeAIResult" payload:@{@"ok": @YES, @"content": content}];
        }];
        [task resume];
        return;
    }

    if ([action isEqualToString:@"openWhatsApp"]) {
        NSURL *url = [NSURL URLWithString:@"whatsapp://"];
        if (![[NSWorkspace sharedWorkspace] openURL:url]) {
            [[NSWorkspace sharedWorkspace] openURL:[NSURL URLWithString:@"https://web.whatsapp.com/"]];
        }
        return;
    }

    if ([action isEqualToString:@"exportFile"]) {
        NSString *filename = payload[@"filename"] ?: @"workbae-export.txt";
        NSString *content = payload[@"content"] ?: @"";
        NSSavePanel *panel = [NSSavePanel savePanel];
        panel.nameFieldStringValue = filename;
        panel.canCreateDirectories = YES;
        [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse result) {
            if (result == NSModalResponseOK) {
                NSError *error = nil;
                [content writeToURL:panel.URL atomically:YES encoding:NSUTF8StringEncoding error:&error];
                if (error) {
                    NSAlert *alert = [[NSAlert alloc] init];
                    alert.messageText = @"The export could not be saved.";
                    alert.informativeText = error.localizedDescription;
                    [alert runModal];
                }
            }
        }];
    }
}

@end

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        NSApplication *app = [NSApplication sharedApplication];
        WorkBaeDelegate *delegate = [[WorkBaeDelegate alloc] init];
        app.delegate = delegate;
        [app setActivationPolicy:NSApplicationActivationPolicyRegular];
        [app run];
    }
    return 0;
}
