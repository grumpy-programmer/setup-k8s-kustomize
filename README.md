# Setup k8s kustomize [![main](https://github.com/grumpy-programmer/setup-k8s-kustomize/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/grumpy-programmer/setup-k8s-kustomize/actions/workflows/main.yml)

GitHub action for setup kubernetes [kustomize](https://github.com/kubernetes-sigs/kustomize)

## Usage

With latest version of kustomize

```
  - name: setup-k8s-kustomize
    uses: grumpy-programmer/setup-k8s-kustomize@v1
```

With specific version of kustomize

```
  - name: setup-k8s-kustomize
    uses: grumpy-programmer/setup-k8s-kustomize@v1
    with:
        version: 4.5.4
```
