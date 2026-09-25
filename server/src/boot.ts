process.stdout.write("[boot] node process started\n");

process.on("uncaughtException", (err) => {
  process.stderr.write(
    `[boot] uncaughtException: ${err?.stack ?? String(err)}\n`,
  );
  setTimeout(() => process.exit(1), 50);
});

process.on("unhandledRejection", (reason) => {
  process.stderr.write(
    `[boot] unhandledRejection: ${reason instanceof Error ? reason.stack : String(reason)}\n`,
  );
  setTimeout(() => process.exit(1), 50);
});
