# Running Maximus Compliance yourself

```bash
docker run -d \
  --name maximus \
  -p 3000:3000 \
  -v maximus-data:/data \
  ghcr.io/jesse-stonedog/maximus-compliance:latest
```

Then open <http://localhost:3000>.

## The volume is not optional

`-v maximus-data:/data` is where the SQLite database lives. Without it the
database is written **inside** the container and is destroyed the next time you
recreate it. The app logs its database path on startup — check that line if you
are unsure where your data went.

## Unverified rules

By default the calendar shows **only rules a person has checked against the
statute they cite**. The rule set is young, so this may well be empty.

To see unverified ones as well:

```bash
-e MAXIMUS_INCLUDE_DRAFT=true
```

Every such row is marked *unverified* in the UI, and a banner says so. Treat
them as a prompt to go and check the statute, not as fact.

## Backing up

**Stop the container first.** On shutdown the app folds its write-ahead log back
into `maximus.sqlite`, so a stopped container leaves a complete, copyable
database file.

```bash
docker stop maximus
docker run --rm -v maximus-data:/data -v "$PWD:/backup" alpine \
  tar czf /backup/maximus-backup.tar.gz -C /data .
docker start maximus
```

`/data` holds the database and the `documents/` directory with your uploaded
files. **Both matter** — the database records what a document is and where its
reference numbers are; the directory holds the file itself.

To restore, stop the container and untar into an empty volume.

### If you must copy while it is running

Take the whole directory, not just `maximus.sqlite`. While the app is running,
recent writes live in `maximus.sqlite-wal` and the main file alone is
**incomplete** — it will open without complaint and silently be missing your
latest changes, which is the worst kind of backup. Stopping first avoids the
question entirely.

## Upgrading

Pull the new image and recreate the container. Migrations run automatically on
startup — there is no separate migrate command, on purpose, because "pull and
restart" is the whole upgrade workflow for this tier.

```bash
docker pull ghcr.io/jesse-stonedog/maximus-compliance:latest
docker rm -f maximus && docker run -d ... # same flags as above
```

Your data is on the volume, not in the container.

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `MAXIMUS_DB_PATH` | `/data/maximus.sqlite` | Where the database file lives |
| `MAXIMUS_INCLUDE_DRAFT` | unset (off) | Show rules not yet verified against a statute |
| `PORT` | `3000` | Listen port |

## This is not legal or tax advice

The software tracks deadlines; it does not replace an attorney or an
accountant. Every obligation cites its source so you can check it. You remain
responsible for your own filings.
