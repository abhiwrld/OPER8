# OPER8

OPER8 is a minimal web GUI for coding agents (currently Codex, Claude, and OpenCode, more coming soon).

## Running Locally

> [!WARNING]
> OPER8 currently supports Codex, Claude, and OpenCode.
> Install and authenticate at least one provider before use:
>
> - Codex: install [Codex CLI](https://developers.openai.com/codex/cli) and run `codex login`
> - Claude: install [Claude Code](https://claude.com/product/claude-code) and run `claude auth login`
> - OpenCode: install [OpenCode](https://opencode.ai) and run `opencode auth login`

From this fork:

```bash
cd /Users/abhiwrld/OPER8
npx --yes bun@1.3.11 install
npx --yes bun@1.3.11 run dev
```

The dev runner starts the OPER8 web app and backend together. It prints the local URL when ready.

## Some notes

We are very very early in this project. Expect bugs.

We are not accepting contributions yet.

Observability guide: [docs/observability.md](./docs/observability.md)

## If you REALLY want to contribute still.... read this first

Before local development, prepare the environment and install dependencies:

```bash
npx --yes bun@1.3.11 install
```

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening an issue or PR.

Need support? Join the [Discord](https://discord.gg/jn4EGJjrvv).
