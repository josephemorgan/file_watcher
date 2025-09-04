import chokidar from "chokidar";
import { promises as fs } from "fs";
import path from "path";

if (!process.env.SOURCE_DIR || !process.env.TARGET_DIR) {
  console.error("SOURCE_DIR and TARGET_DIR environment variables must be set.");
  process.exit(1);
}

// Load environment variables
const SOURCE_DIR = process.env.SOURCE_DIR!;
const TARGET_DIR = process.env.TARGET_DIR!;
const RECORD_FILE = process.env.RECORD_FILE || "transfers.json";
const LOG_FILE = process.env.LOG_FILE;

interface Logger {
  log: typeof console.log;
  error: typeof console.error;
  warn: typeof console.warn;
  info: typeof console.info;
  debug: typeof console.debug;
  trace: typeof console.trace;
}

const logger: Logger = LOG_FILE
  ? {
      log: (...args) => {
        fs.appendFile(LOG_FILE, args.join(" ") + "\n").catch(console.error);
      },
      error: (...args) => {
        fs.appendFile(LOG_FILE, args.join(" ") + "\n").catch(console.error);
      },
      warn: (...args) => {
        fs.appendFile(LOG_FILE, args.join(" ") + "\n").catch(console.error);
      },
      info: (...args) => {
        fs.appendFile(LOG_FILE, args.join(" ") + "\n").catch(console.error);
      },
      debug: (...args) => {
        fs.appendFile(LOG_FILE, args.join(" ") + "\n").catch(console.error);
      },
      trace: (...args) => {
        fs.appendFile(LOG_FILE, args.join(" ") + "\n").catch(console.error);
      },
    }
  : console;

// Load or initialize transfer record
async function loadRecord(): Promise<Set<string>> {
  try {
    const data = await fs.readFile(RECORD_FILE, "utf-8");
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
}

async function saveRecord(record: Set<string>) {
  await fs.writeFile(RECORD_FILE, JSON.stringify(Array.from(record)), "utf-8");
}

async function handleFileAdd(filePath: string, record: Set<string>) {
  const stat = await fs.stat(filePath);
  logger.debug(`Detected new file: ${filePath}`);
  if (stat.isDirectory()) {
    logger.debug(`Directory added: ${filePath}, scanning contents...`);
    const files = await fs.readdir(filePath);
    for (const innerFile of files) {
      const innerPath = path.join(filePath, innerFile);
      await handleFileAdd(innerPath, record);
    }
    return;
  }
  const fileName = path.basename(filePath);
  if (record.has(fileName)) return;

  const targetPath = path.join(TARGET_DIR, fileName);
  await fs.copyFile(filePath, targetPath);
  record.add(fileName);
  await saveRecord(record);
  logger.log(`Copied: ${fileName}`);
}

async function main() {
  const record = await loadRecord();

  // Scan SOURCE_DIR for existing files and copy missing ones
  const files = await fs.readdir(SOURCE_DIR);
  for (const fileName of files) {
    handleFileAdd(path.join(SOURCE_DIR, fileName), record);
  }

  const watcher = chokidar.watch(SOURCE_DIR, {
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on("add", async (filePath) => {
    try {
      await handleFileAdd(filePath, record);
    } catch (err) {
      logger.error(`Error copying file: ${err}`);
    }
  });

  logger.log(`Watching ${SOURCE_DIR} for new files...`);
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
