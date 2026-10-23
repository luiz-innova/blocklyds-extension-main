# Development Environment Setup

These steps set up a [mamba](https://mamba.readthedocs.io/)-based development environment for the `blocklyV0` JupyterLab extension.

## 1. Install Miniforge (provides `mamba`)

```bash
curl -L -O "https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-$(uname)-$(uname -m).sh"
bash Miniforge3-$(uname)-$(uname -m).sh
```

If `curl` is not installed, use `wget "https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-$(uname)-$(uname -m).sh"` instead.

Follow the installer prompts. By default Miniforge is installed in `~/miniforge3`.

## 2. Create the environment

> **Edit the `environment.yml` file to change the environment name as you like.**
> The default name is `blocklyds-dev`.

```bash
mamba create -n dev jupyterlab=4 nodejs=18 git copier=7 jinja2-time
```

## 3. Initialize mamba for your shell

```bash
~/miniforge3/bin/mamba init
```

Adjust the path if you installed Miniforge somewhere else (e.g. `/home/ubuntu/miniforge3/bin/mamba init`). Then close and reopen your terminal (or run `source ~/.bashrc`).

## 4. Activate the environment

```bash
mamba activate <NAME>
```

Replace `<NAME>` with the name set in `environment.yml` (e.g. `mamba activate blocklyds-dev`).

> **Note:** This extension is designed to use a language server. It will work without one, but functionality will be reduced. `environment.yml` installs `jupyterlab-lsp` and `python-lsp-server` for Python. For other languages, see the [jupyterlab-lsp language server list](https://jupyterlab-lsp.readthedocs.io/en/latest/Language%20Servers.html).

## 5. Install the extension in development mode

The `jlpm` command is JupyterLab's pinned version of `yarn` that is installed with JupyterLab. You may use `yarn` or `npm` instead of `jlpm` below, but don't do it unless you really know what you're doing.

```bash
# Clone the repo to your local environment
git clone <REPO_URL>

# Change directory to the extension directory
cd blocklyds-extension-main

# Install package in development mode
pip install -e "."

# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite

# Rebuild extension TypeScript source after making changes
jlpm build
```

## 6. Run JupyterLab

```bash
jupyter lab
```

While developing, you can run `jlpm watch` in one terminal to rebuild automatically on changes, and `jupyter lab` in another. Refresh the browser to load the rebuilt extension.
