import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const url = "https://trade.cbp.dhs.gov/ace/dashboard/public/";
const stateFile = "state/system-availability-messages.txt";
const outputFile = process.env.GITHUB_OUTPUT;

function normalize(text) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function setOutput(name, value) {
  if (outputFile) {
    await writeFile(outputFile, `${name}=${value}\n`, { flag: "a" });
  }
}

await mkdir("state", { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1200 },
    userAgent:
      "Mozilla/5.0 (compatible; ACEAvailabilityMonitor/1.0; +https://github.com/shuffman888/ace-availability-monitor)",
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});

  const heading = page.getByText("System Availability Messages", { exact: true }).first();
  await heading.waitFor({ state: "visible", timeout: 45_000 });
  await page.waitForTimeout(3_000);

  const sectionText = await heading.evaluate((element) => {
    const clean = (value) =>
      (value || "")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/\s*\n\s*/g, "\n")
        .trim();

    const title = clean(element.textContent);
    let node = element;

    while (node.parentElement && node.parentElement !== document.body) {
      node = node.parentElement;
      const text = clean(node.innerText);

      // Select the smallest surrounding container that includes actual
      // message content in addition to the section heading.
      if (text.length >= title.length + 8) {
        return text;
      }
    }

    throw new Error("Could not isolate the System Availability Messages section");
  });

  const current = normalize(sectionText);
  if (!current.startsWith("System Availability Messages") || current.length < 36) {
    throw new Error("Captured section was empty or did not match the expected heading");
  }

  let previous = null;
  try {
    previous = normalize(await readFile(stateFile, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  if (previous === null) {
    await writeFile(stateFile, `${current}\n`);
    await setOutput("changed", "baseline");
    console.log("Initial System Availability Messages baseline captured.");
  } else if (previous !== current) {
    await writeFile(stateFile, `${current}\n`);
    await setOutput("changed", "true");
    console.log("System Availability Messages changed.");
  } else {
    await setOutput("changed", "false");
    console.log("No change detected.");
  }
} finally {
  await browser.close();
}
