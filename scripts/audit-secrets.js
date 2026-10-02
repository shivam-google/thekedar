import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })
const findings = []
const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['Supabase secret', /\bsb_secret_[A-Za-z0-9_-]{20,}\b/],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['credential assignment', /(?:SUPABASE_SERVICE_ROLE_KEY|VERCEL_TOKEN|GITHUB_TOKEN|DATABASE_URL|DB_PASSWORD|SMTP_PASSWORD)\s*[=:]\s*["']?(?!["']?\s*(?:$|["']|process\.|import\.|<|\$|your_|example|placeholder))[^\s"']{12,}/i],
]

function scan(content, path, version) {
  if (/(?:^|\/)\.env(?:\.|$)/.test(path) && !path.endsWith('.env.example')) findings.push({ path, version, kind: 'committed environment file' })
  content.split('\n').forEach((line, index) => {
    for (const [kind, pattern] of patterns) if (pattern.test(line)) findings.push({ path, version, line: index + 1, kind })
    for (const token of line.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g)) {
      try {
        const payload = JSON.parse(Buffer.from(token[0].split('.')[1], 'base64url').toString())
        if (payload.role === 'service_role') findings.push({ path, version, line: index + 1, kind: 'Supabase service-role JWT' })
      } catch { /* Not a JWT. */ }
    }
  })
}

const objects = git('rev-list', '--objects', '--all').trim().split('\n')
let blobs = 0
for (const entry of objects) {
  const separator = entry.indexOf(' ')
  if (separator < 0) continue
  const id = entry.slice(0, separator), path = entry.slice(separator + 1)
  if (git('cat-file', '-t', id).trim() !== 'blob') continue
  const content = git('cat-file', '-p', id)
  scan(content, path, id.slice(0, 12))
  blobs++
}
const files = git('ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean)
for (const path of new Set(files)) {
  try { scan(readFileSync(path, 'utf8'), path, 'working tree') } catch { /* Removed file. */ }
}
console.log(JSON.stringify({ commits: Number(git('rev-list', '--count', '--all').trim()), historicalBlobs: blobs, workingFiles: files.length, findings }, null, 2))
console.log('Audit covers reachable Git history and non-ignored working files. Heuristic scanning cannot prove that no secret exists.')
if (findings.length) process.exitCode = 1
