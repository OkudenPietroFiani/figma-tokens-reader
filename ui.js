// src/frontend/index-test.ts
console.log("[TEST] Script started");
var testDiv = document.createElement("div");
testDiv.id = "minimal-test";
testDiv.style.cssText = "padding: 30px; background: #00ff00; color: black; font-size: 20px; font-family: sans-serif; margin: 20px;";
testDiv.innerHTML = "<h1>MINIMAL TEST SUCCESS!</h1><p>If you see this green box, the bundled JavaScript is executing.</p>";
console.log("[TEST] Test element created:", testDiv);
if (document.readyState === "loading") {
  console.log("[TEST] Waiting for DOM...");
  document.addEventListener("DOMContentLoaded", () => {
    console.log("[TEST] DOM ready, appending element");
    document.body.appendChild(testDiv);
    console.log("[TEST] Element appended. Body has", document.body.children.length, "children");
  });
} else {
  console.log("[TEST] DOM already ready, appending element immediately");
  document.body.appendChild(testDiv);
  console.log("[TEST] Element appended. Body has", document.body.children.length, "children");
}
console.log("[TEST] Script completed");
