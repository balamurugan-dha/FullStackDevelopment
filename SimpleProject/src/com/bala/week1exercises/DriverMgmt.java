package com.bala.week1exercises;

import org.openqa.selenium.Proxy;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public class DriverMgmt {

    public static WebDriver getChromeDriverWithProxyAuth(String proxyHost, int proxyPort,
                                                         String proxyUser, String proxyPass) throws IOException {
        // Create temporary extension files
        Path extensionDir = Files.createTempDirectory("proxyAuthExtension");
        Path backgroundJs = extensionDir.resolve("background.js");
        Path manifestJson = extensionDir.resolve("manifest.json");
        Path zipFile = Files.createTempFile("proxy_auth_extension", ".zip");

        // Create manifest.json
        String manifest = "{\n" +
                "    \"version\": \"1.0.0\",\n" +
                "    \"manifest_version\": 2,\n" +
                "    \"name\": \"Chrome Proxy\",\n" +
                "    \"permissions\": [\n" +
                "        \"proxy\",\n" +
                "        \"tabs\",\n" +
                "        \"unlimitedStorage\",\n" +
                "        \"storage\",\n" +
                "        \"<all_urls>\",\n" +
                "        \"webRequest\",\n" +
                "        \"webRequestBlocking\"\n" +
                "    ],\n" +
                "    \"background\": {\n" +
                "        \"scripts\": [\"background.js\"]\n" +
                "    },\n" +
                "    \"minimum_chrome_version\":\"22.0.0\"\n" +
                "}";

        Files.write(manifestJson, manifest.getBytes());

        // Create background.js with proxy credentials
        String background = "var config = {\n" +
                "    mode: \"fixed_servers\",\n" +
                "    rules: {\n" +
                "        singleProxy: {\n" +
                "            scheme: \"http\",\n" +
                "            host: \"" + proxyHost + "\",\n" +
                "            port: " + proxyPort + "\n" +
                "        },\n" +
                "        bypassList: [\"localhost\"]\n" +
                "    }\n" +
                "};\n" +
                "\n" +
                "chrome.proxy.settings.set({value: config, scope: \"regular\"}, function() {});\n" +
                "\n" +
                "function callbackFn(details) {\n" +
                "    return {\n" +
                "        authCredentials: {\n" +
                "            username: \"" + proxyUser + "\",\n" +
                "            password: \"" + proxyPass + "\"\n" +
                "        }\n" +
                "    };\n" +
                "}\n" +
                "\n" +
                "chrome.webRequest.onAuthRequired.addListener(\n" +
                "    callbackFn,\n" +
                "    {urls: [\"<all_urls>\"]},\n" +
                "    ['blocking']\n" +
                ");";

        Files.write(backgroundJs, background.getBytes());

        // Zip the extension files
        try (ZipOutputStream zos = new ZipOutputStream(Files.newOutputStream(zipFile))) {
            addToZip(zos, "manifest.json", Files.readAllBytes(manifestJson));
            addToZip(zos, "background.js", Files.readAllBytes(backgroundJs));
        }

        // Configure ChromeOptions
        ChromeOptions options = new ChromeOptions();
        options.addExtensions(new File(zipFile.toString()));

        // Create and return WebDriver instance
        return new ChromeDriver(options);
    }

    private static void addToZip(ZipOutputStream zos, String fileName, byte[] content) throws IOException {
        ZipEntry entry = new ZipEntry(fileName);
        zos.putNextEntry(entry);
        zos.write(content);
        zos.closeEntry();
    }

    public static void main(String[] args) throws IOException {
        // Example usage
        System.setProperty("webdriver.chrome.driver", "/path/to/chromedriver");

        WebDriver driver = getChromeDriverWithProxyAuth(
                "your.proxy.host",
                8080,
                "yourUsername",
                "yourPassword");

        try {
            driver.get("https://example.com");
            // Your test code here
        } finally {
            driver.quit();
        }
    }
}