import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('direct official runtime imports are declared for strict package managers', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'))
  for (const name of ['@deepseek-ai/dsh-tools', '@deepseek-ai/dsh-llm']) {
    assert.equal(manifest.peerDependencies[name], manifest.engines.dsh, `${name} must be a direct peer`)
    assert.equal(manifest.devDependencies[name], manifest.engines.dsh, `${name} must be directly testable`)
    assert.equal(lock.packages[''].peerDependencies[name], manifest.peerDependencies[name])
    assert.equal(lock.packages[''].devDependencies[name], manifest.devDependencies[name])
  }
})
