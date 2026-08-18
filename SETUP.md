# ACE System Availability Monitor

This repository checks the public CBP ACE Availability Dashboard every five
minutes and stores only the text from the **System Availability Messages**
section. A commit is created only when that text changes. GitHub can email each
change commit directly, so no SMTP server or sender domain is required.

## Enable email alerts

1. Open the repository's **Settings** tab.
2. Under **Integrations**, select **Email notifications**.
3. Enter the private email address where you want to receive alerts. Do not
   add the address to repository files.
4. If GitHub offers a branch filter, select `main`.
5. Select **Setup notifications**.

## Test the monitor

1. Open the repository's **Actions** tab.
2. Select **Monitor ACE availability messages**.
3. Select **Run workflow**, then confirm **Run workflow**.
4. The first successful run creates the baseline snapshot in `state/`.

The workflow uses a monthly activity marker because GitHub may automatically
disable scheduled workflows in public repositories after 60 days without
repository activity.

## Important behavior

- The monitor reports additions, edits, and removals within the target section.
- It ignores changes elsewhere on the dashboard.
- Scheduled GitHub Actions can be delayed during periods of high load, so five
  minutes is the requested interval rather than a real-time guarantee.
- If CBP changes the page heading or layout, the workflow fails instead of
  silently recording an empty snapshot.
