// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.
//
// Generated file. Do not edit.
//

import PackageDescription

let package = Package(
    name: "FlutterGeneratedPluginSwiftPackage",
    platforms: [
        .macOS("10.15")
    ],
    products: [
        .library(name: "FlutterGeneratedPluginSwiftPackage", type: .static, targets: ["FlutterGeneratedPluginSwiftPackage"])
    ],
    dependencies: [
        .package(name: "webview_flutter_wkwebview", path: "../.packages/webview_flutter_wkwebview-3.25.1"),
        .package(name: "url_launcher_macos", path: "../.packages/url_launcher_macos-3.2.5"),
        .package(name: "record_macos", path: "../.packages/record_macos-1.2.2"),
        .package(name: "file_selector_macos", path: "../.packages/file_selector_macos-0.9.5"),
        .package(name: "FlutterFramework", path: "../.packages/FlutterFramework")
    ],
    targets: [
        .target(
            name: "FlutterGeneratedPluginSwiftPackage",
            dependencies: [
                .product(name: "webview-flutter-wkwebview", package: "webview_flutter_wkwebview"),
                .product(name: "url-launcher-macos", package: "url_launcher_macos"),
                .product(name: "record-macos", package: "record_macos"),
                .product(name: "file-selector-macos", package: "file_selector_macos"),
                .product(name: "FlutterFramework", package: "FlutterFramework")
            ]
        )
    ]
)
