# Security Policy

## Reporting a vulnerability

Please do not open a public issue for security problems. Use GitHub's private
reporting instead: **Security** tab → **Report a vulnerability** on
https://github.com/ans-ib/Minimal-Bar-for-YouTube. You will get a reply within
a few days, and a fix is released as soon as it is ready. Credit is given in
the changelog unless you prefer otherwise.

## Scope

The extension runs only on `www.youtube.com`, makes no network requests, has
no background process, and stores nothing but its three settings. Anything
that contradicts this, such as a way to make it read or send page data, is in
scope.

## How releases are protected

- Every store package is built by GitHub Actions from a tagged commit, and the
  `SHA256SUMS` file attached to each release lets anyone verify a download.
- Workflow actions are pinned to commit hashes and updated by Dependabot.
- Store API credentials exist only as secrets in a protected GitHub
  environment. They are never in the repository, and the secret scanner in CI
  checks every push.
