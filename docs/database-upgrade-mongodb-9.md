# Hetzner MongoDB 9.0 upgrade

The Hetzner Compose deployment now targets MongoDB 9.0.4. Existing 7.0 data
must be upgraded through MongoDB 8.0 before the 9.0 server starts. MongoDB
requires this major-version path; do not attach a 7.0 data directory to a 9.0
container directly.

## Before the maintenance window

1. Confirm the current server is MongoDB 7.0 and its feature compatibility
   version (FCV) is `7.0`. This runbook assumes the existing `mongo_data`
   Compose volume is mounted at `/data/db`.
2. Take and verify a restorable backup using the deployment's existing backup
   procedure. Record the backup location and current image digest.
3. Review the MongoDB 8.0 and 9.0 compatibility changes, validate the app and
   backup against a staging copy, and schedule downtime. The Hetzner service is
   a standalone MongoDB deployment, so this procedure has downtime.
4. Ensure enough disk space for the database upgrade and backup. Keep the
   existing `mongo_data` volume; do not remove, rename, or recreate it.

## Upgrade 7.0 to 8.0

Stop application writes, then start the Mongo service with the current 8.0
patch image while keeping the same volume:

```sh
docker compose stop app
SNEUP_MONGO_IMAGE_TAG=8.0.30 docker compose up -d --no-deps mongo
docker compose ps mongo
docker compose exec mongo mongod --version
```

Wait for the Mongo health check and verify that the server reports 8.0. Connect
as the MongoDB root user (let `mongosh` prompt for the password), then inspect
the FCV. After confirming the server is healthy and the backup is available,
set FCV to 8.0:

```javascript
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
db.adminCommand({ setFeatureCompatibilityVersion: "8.0", confirm: true })
```

Confirm the command succeeded and the FCV reports `8.0` before continuing.

## Upgrade 8.0 to 9.0

Start the current MongoDB 9.0 patch image on the same `mongo_data` volume:

```sh
SNEUP_MONGO_IMAGE_TAG=9.0.4 docker compose up -d --no-deps mongo
docker compose ps mongo
docker compose exec mongo mongod --version
```

Wait for the health check, verify the server reports 9.0, and check application
data before resuming writes. Keep FCV at the prior version through a burn-in
period. When the deployment is healthy and downgrade is no longer needed,
connect as the MongoDB root user and enable 9.0 features:

```javascript
db.adminCommand({ setFeatureCompatibilityVersion: "9.0", confirm: true })
```

Then start the application and check the health endpoint, sign-in, and a
read/write workflow. Record the final image digest, server version, FCV, backup
location, and operator acceptance in the deployment log.

## Recovery notes

Do not treat changing the image tag back as a rollback after the database has
been upgraded or written by MongoDB 9. Use MongoDB's supported single-major
downgrade procedure while FCV and compatibility permit it, or restore the
verified pre-upgrade backup into a separate recovery volume and validate it
before switching the deployment. Keep the original backup and volume until
the upgraded service has passed the agreed burn-in and recovery checks.

The image tags in this file and CI are explicit patch versions. Check MongoDB's
release notes and compatibility guidance before a later patch or major upgrade:

- [MongoDB 7.0 to 8.0 upgrade](https://www.mongodb.com/docs/manual/release-notes/8.0-upgrade/)
- [MongoDB 8.0 to 9.0 upgrade path](https://www.mongodb.com/docs/manual/release-notes/9.0-upgrade/)
- [MongoDB 9.0.4 release notes](https://www.mongodb.com/docs/manual/release-notes/9.0/)
