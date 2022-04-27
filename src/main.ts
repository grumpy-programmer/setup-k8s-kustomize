import * as core from '@actions/core';
import * as github from '@actions/github';

import { GitHub } from '@actions/github/lib/utils';
import * as cache from '@actions/tool-cache';
import { components } from '@octokit/openapi-types/types.d';

type Octokit = InstanceType<typeof GitHub>;
export type Release = components['schemas']['release'];
export type ReleaseAsset = components['schemas']['release-asset'];

async function main() {
  const platform = process.platform;
  const arch = process.arch === 'x64' ? 'amd64' : process.arch;
  const toolName = 'kustomize';

  const token = core.getInput('token', { required: true });
  const requestedVersion = core.getInput('version') || 'latest';

  core.debug(`input: token: ${token.length > 0 ? 'present' : 'empty'}, version: ${requestedVersion}`);

  const octokit = github.getOctokit(token);

  const release = await getRelease(octokit, requestedVersion);

  if (release === undefined) {
    core.setFailed(`Release with version ${requestedVersion} not found`);
    return;
  }

  const version = getVersionFromTag(release.tag_name);

  core.info(`Evaluated ${toolName} version ${version}`);

  const asset = release.assets.find(assetFilter(platform, arch));

  if (asset === undefined) {
    core.setFailed(`Asset for release ${requestedVersion} for platform ${platform} arch ${arch} not found`);
    return;
  }

  let toolPath = cache.find(toolName, version);

  if (toolPath.length !== 0) {
    core.info(`Found ${toolName} version ${version} in cache`);
    core.addPath(toolPath);
    core.info(`Add ${toolName} version ${version} path`);
    return;
  }

  core.info(`No ${toolName} version ${version} in cache`);

  const downloadPath = await cache.downloadTool(asset.browser_download_url);
  core.info(`Download ${toolName} version ${version} from release ${release.name} asset ${asset.name}`);
  const extractedPath = await cache.extractTar(downloadPath);

  const filename = process.platform === 'win32' ? 'kustomize.exe' : 'kustomize';

  toolPath = await cache.cacheFile(`${extractedPath}/${filename}`, filename, toolName, version);
  core.info(`Cache ${toolName} version ${version}`);

  core.addPath(toolPath);
  core.info(`Add ${toolName} version ${version} path`);
}

async function getRelease(octokit: Octokit, version?: string): Promise<Release | undefined> {
  if (version === 'latest') {
    try {
      const { data: releases } = await octokit.rest.repos.listReleases({
        owner: 'kubernetes-sigs',
        repo: 'kustomize',
        per_page: 200
      });

      return releases.filter(releaseFilter)
        .sort(releaseSort)
        .pop();
    } catch (e) {
      core.error(`List releases error: ${e}`);
      core.debug(`List releases error details: ${JSON.stringify(e)}`);
    }
  }

  try {
    const { data: release } = await octokit.rest.repos.getReleaseByTag({
      owner: 'kubernetes-sigs',
      repo: 'kustomize',
      tag: `kustomize/v${version}`
    });

    return release;
  } catch (e) {
    core.error(`Get release by tag error: ${e}`);
    core.debug(`Get release by tag error details: ${JSON.stringify(e)}`);
  }
}

function releaseFilter(release: Release): boolean {
  return release.tag_name.startsWith('kustomize/');
}

function assetFilter(platform: string, arch: string) {
  return (asset: ReleaseAsset) => asset.name.includes(`${platform}_${arch}`);
}

function releaseSort(a: Release, b: Release): number {
  return Date.parse(a.created_at) - Date.parse(b.created_at);
}

function getVersionFromTag(tag: string): string {
  return tag.replace('kustomize/v', '');
}

main()
  .catch(e => {
    core.error(`Not caught error: ${e}`);
    core.debug(`Not caught error details: ${JSON.stringify(e)}`);
  });
