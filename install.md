# Install on The Littlest JupyterHub (TLJH)

These steps install [TLJH](https://tljh.jupyter.org/) on a fresh Ubuntu server, build the `blocklyV0` JupyterLab extension from this repo, and deploy it for every hub user.

For a local development setup (no hub), see [installdev.md](installdev.md).

## 1. Update the system and install prerequisites

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl python3 python3-dev python3-venv
```

Install Node.js 20 from [NodeSource](https://github.com/nodesource/distributions) (Ubuntu 22.04's own `nodejs` package is v12, which is too old — JupyterLab 4 needs 18+):

```bash
sudo apt remove -y nodejs libnode72   # only if an old apt nodejs is installed
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # should print v20.x
```

## 2. Install TLJH

Replace `<ADMIN_USER>` with the name of the hub admin account.

> **Deactivate any conda/mamba environment first** (`mamba deactivate` / `conda deactivate`). If `CONDA_PREFIX` leaks into the installer, it fails with `AssertionError` at `assert "conda" in package_versions`.

```bash
curl -L https://tljh.jupyter.org/bootstrap.py | sudo python3 - --admin <ADMIN_USER>
```

When it finishes, open `http://<SERVER_IP>` in a browser and log in as `<ADMIN_USER>` (the password you type the first time becomes the admin password).

## 3. Get the code and create a build environment

```bash
git clone https://github.com/luiz-innova/blocklyds-extension-main
cd blocklyds-extension-main

python3 -m venv dev
source dev/bin/activate

pip install --upgrade pip
pip install "jupyterlab>=4.2,<5" "hatchling>=1.5.0" "hatch-nodejs-version>=0.3.2" build
```

## 4. Build the extension

```bash
jlpm install
jlpm run build:prod
python3 -m build
```

This creates a wheel (`.whl`) and a source archive (`.tar.gz`) in `dist/`.

## 5. Deploy the extension to TLJH

Install the wheel into the TLJH user environment (the Python environment every hub user runs in):

```bash
sudo /opt/tljh/user/bin/pip install dist/*.whl
```

Optional but recommended — the extension works best with a language server:

```bash
sudo /opt/tljh/user/bin/pip install jupyterlab-lsp python-lsp-server
```

Restart the hub so users pick up the extension:

```bash
sudo systemctl restart jupyterhub
```

Users who already have a running server must stop and restart it (**File → Hub Control Panel → Stop My Server**).

## 6. Verify

```bash
/opt/tljh/user/bin/jupyter labextension list
```

`blocklyV0` should be listed as **enabled** and **OK**.

## Updating to a new version

```bash
cd blocklyds-extension-main
source dev/bin/activate
git pull
rm -rf dist
jlpm run build:prod
python3 -m build
sudo /opt/tljh/user/bin/pip install --force-reinstall dist/*.whl
sudo systemctl restart jupyterhub
```

## Uninstalling

```bash
sudo /opt/tljh/user/bin/pip uninstall -y blocklyV0
sudo systemctl restart jupyterhub
```
