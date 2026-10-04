import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, Terminal, Play, AlertCircle } from 'lucide-react';
import API from '../../services/api';
import toast from 'react-hot-toast';

export const PreCommitSetup = ({ apiKey }) => {
  const [os, setOs] = useState('mac'); // 'mac' | 'windows'
  const [lang, setLang] = useState('js'); // 'js' | 'py' | 'go'
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const getTargetEndpoint = () => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    return `${socketUrl}/api/v1/risk-check`;
  };

  const getScript = () => {
    const endpoint = getTargetEndpoint();
    const key = apiKey || 'YOUR_CODELENS_API_KEY';
    const regex = lang === 'js' ? '\\.js$' : lang === 'py' ? '\\.py$' : '\\.go$';
    const langLabel = lang === 'js' ? 'javascript' : lang === 'py' ? 'python' : 'go';

    if (os === 'windows') {
      return `# Save this file as .git/hooks/pre-commit
# Make sure to run in PowerShell
$files = git diff --cached --name-only --diff-filter=ACM | Select-String -Pattern "${regex}"
if ($files) {
    foreach ($file in $files) {
        if (Test-Path $file.Line) {
            $bytes = [System.IO.File]::ReadAllBytes($file.Line)
            $base64 = [Convert]::ToBase64String($bytes)
            $body = @{ code = $base64; language = "${langLabel}" } | ConvertTo-Json
            
            try {
                $response = Invoke-RestMethod -Uri "${endpoint}" -Method Post -Headers @{ "X-API-Key" = "${key}" } -Body $body -ContentType "application/json" -TimeoutSec 5
                if ($response.blockCommit -eq $true) {
                    Write-Host "🚫 CodeLens blocked commit: high risk in $file" -ForegroundColor Red
                    Write-Host "Top Issue: $($response.topIssue.message)" -ForegroundColor Yellow
                    exit 1
                }
            } catch {
                Write-Host "⚠️ CodeLens risk check failed, passing commit." -ForegroundColor Gray
            }
        }
    }
}`;
    }

    // Mac/Linux Bash
    return `#!/bin/bash
# Save this file as .git/hooks/pre-commit
# Run: chmod +x .git/hooks/pre-commit

FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '${regex}')
if [ -z "$FILES" ]; then
  exit 0
fi

for FILE in $FILES; do
  if [ -f "$FILE" ]; then
    # Encode code content to base64
    BASE64_CODE=$(cat "$FILE" | base64 | tr -d '\\r\\n')
    
    # Execute quick risk check
    RESULT=$(curl -s -X POST "${endpoint}" \\
      -H "X-API-Key: ${key}" \\
      -H "Content-Type: application/json" \\
      -d "{\\"code\\":\\"$BASE64_CODE\\", \\"language\\":\\"${langLabel}\\"}")
      
    BLOCK=$(echo $RESULT | node -e "process.stdin.resume();
      let d=''; process.stdin.on('data',c=>d+=c);
      process.stdin.on('end',()=> {
        try {
          console.log(JSON.parse(d).blockCommit === true);
        } catch(e) {
          console.log(false);
        }
      })")
      
    if [ "$BLOCK" = "true" ]; then
      echo "🚫 CodeLens blocked commit: high risk in $FILE"
      echo "Top issue: $(echo $RESULT | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).topIssue?.message || ''))")"
      exit 1
    fi
  fi
done`;
  };

  const copyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    toast.success('API Key copied!');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const copyScript = () => {
    navigator.clipboard.writeText(getScript());
    setCopiedScript(true);
    toast.success('Hook script copied!');
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const testHookLive = async () => {
    if (!apiKey) {
      return toast.error('Generate a CodeLens Integration Key first!');
    }

    setTesting(true);
    setTestResult(null);

    const dummyCode = `function fetchUserData(userId) {
  let query = "SELECT * FROM users WHERE id = " + userId; // SQL Injection Vulnerability
  db.execute(query);
}`;

    try {
      const response = await API.post('/v1/risk-check', 
        { code: btoa(dummyCode), language: 'javascript' },
        { headers: { 'X-API-Key': apiKey } }
      );
      setTestResult(response.data);
      if (response.data.blockCommit) {
        toast.success('Test check successful: blocked high risk commit proposal.');
      } else {
        toast.success('Test check completed: safe commit code.');
      }
    } catch (error) {
      toast.error('Hook test check failed: Verify key setup');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-bg-1 border border-border rounded-lg p-6 shadow-xl space-y-6">
      
      {/* Title */}
      <div>
        <h3 className="text-base font-bold text-text-1 font-display flex items-center gap-2 border-b border-border pb-2">
          <ShieldCheck className="text-accent" size={18} /> Git Pre-Commit Hook Setup
        </h3>
        <p className="text-xs text-text-2 mt-1 leading-relaxed">
          Enforce quality gates locally. Prevent developers from committing critical bugs or security vulnerabilities to local git branches.
        </p>
      </div>

      {/* Integration key card */}
      <div className="bg-bg-2 border border-border p-4 rounded-lg space-y-2">
        <label className="text-[10px] uppercase font-bold tracking-wider text-text-2 block">
          Your Integration API Key
        </label>
        {apiKey ? (
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={apiKey}
              className="w-full bg-bg-0 border border-border rounded px-3 py-1.5 text-xs text-text-1 font-mono focus:outline-none"
            />
            <button
              onClick={copyKey}
              className="bg-bg-1 border border-border p-2 rounded text-text-2 hover:text-text-1 transition-all"
              title="Copy API Key"
            >
              {copiedKey ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            </button>
          </div>
        ) : (
          <div className="text-xs text-warning flex items-center gap-1.5 py-1">
            <AlertCircle size={14} /> Generate a CLI Integration Key under "CI/CD CLI Integrations" first.
          </div>
        )}
      </div>

      {/* Hook Script Configurator */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3">
            {/* OS selector */}
            <div className="flex bg-bg-2 rounded p-0.5 border border-border">
              <button
                onClick={() => setOs('mac')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${os === 'mac' ? 'bg-accent text-bg-0' : 'text-text-2 hover:text-text-1'}`}
              >
                macOS / Linux
              </button>
              <button
                onClick={() => setOs('windows')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${os === 'windows' ? 'bg-accent text-bg-0' : 'text-text-2 hover:text-text-1'}`}
              >
                Windows (PowerShell)
              </button>
            </div>

            {/* Language filter selector */}
            <div className="flex bg-bg-2 rounded p-0.5 border border-border">
              <button
                onClick={() => setLang('js')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${lang === 'js' ? 'bg-accent2 text-bg-0' : 'text-text-2 hover:text-text-1'}`}
              >
                JS / TS
              </button>
              <button
                onClick={() => setLang('py')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${lang === 'py' ? 'bg-accent2 text-bg-0' : 'text-text-2 hover:text-text-1'}`}
              >
                Python
              </button>
              <button
                onClick={() => setLang('go')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${lang === 'go' ? 'bg-accent2 text-bg-0' : 'text-text-2 hover:text-text-1'}`}
              >
                Go
              </button>
            </div>
          </div>

          <button
            onClick={copyScript}
            className="text-xs bg-bg-2 hover:bg-border border border-border px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-colors"
          >
            {copiedScript ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            Copy Hook Script
          </button>
        </div>

        {/* Snippet box */}
        <div className="relative">
          <Terminal className="absolute right-3 top-3 text-text-2 opacity-30" size={16} />
          <pre className="bg-bg-2 border border-border p-4 rounded text-[11px] font-mono text-text-1 overflow-x-auto leading-relaxed max-h-60 select-all">
            {getScript()}
          </pre>
        </div>
      </div>

      {/* Live sandbox test hook */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-1 uppercase tracking-wider font-display">Sandbox Test Hook</span>
          <button
            onClick={testHookLive}
            disabled={testing || !apiKey}
            className="bg-accent2 text-bg-0 hover:bg-accent2/80 disabled:opacity-50 px-4 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-accent2/10"
          >
            <Play size={12} fill="currentColor" />
            {testing ? 'Analyzing Sandbox...' : 'Test My Hook'}
          </button>
        </div>

        {testResult && (
          <div className={`p-4 border rounded text-xs leading-relaxed space-y-2 ${
            testResult.blockCommit 
              ? 'bg-danger/10 border-danger/25 text-danger' 
              : 'bg-success/10 border-success/25 text-success'
          }`}>
            <p className="font-bold flex items-center gap-1">
              <span>Status:</span>
              <span className="uppercase font-extrabold">{testResult.blockCommit ? 'Commit Blocked 🚫' : 'Commit Allowed ✅'}</span>
            </p>
            <p>Risk Score: <span className="font-bold">{testResult.riskScore}/100</span> | Est. review time: {testResult.estimatedReviewTime}</p>
            {testResult.topIssue && (
              <p className="border-t border-current/20 pt-2 font-mono">
                ⚠️ Top Issue (Line {testResult.topIssue.line}): {testResult.topIssue.message}
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default PreCommitSetup;
