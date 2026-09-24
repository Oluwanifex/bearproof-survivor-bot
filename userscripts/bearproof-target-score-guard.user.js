// ==UserScript==
// @name         Bearproof target-score guard
// @namespace    bearproof-survivor-bot
// @version      1.2.0
// @description  Bearproof Build #2 development helper with target-score guard and verified run submission.
// @match        http://localhost/b/2/*
// @match        http://127.0.0.1/b/2/*
// @match        https://bearproof.app/b/2/*
// @match        https://www.bearproof.app/b/2/*
// @run-at       document-start
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  const page = window;
  const STORAGE_KEY = 'bearproof-target-score';
  const PLAYER_ID_KEY = 'bearproof-player-id';
  const PLAYER_NAME_KEY = 'bearproof-player-name';
  const BUILD = 2;
  const DEFAULT_TARGET = 80000;
  const POLL_MS = 100;
  let target = readTarget();
  let enabled = false;
  let reached = false;
  let activeSim = null;
  let originalTimer = null;
  let pollHandle = null;
  let panel;
  let status;
  let submitButton;
  let submitted = false;

  function readTarget() {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_TARGET;
  }

  function getHook() {
    return page.__bearproof && typeof page.__bearproof.summary === 'function'
      ? page.__bearproof
      : null;
  }

  function getSimulation() {
    const hook = getHook();
    return hook && hook.game && hook.game.sim ? hook.game.sim : null;
  }

  function getLastRun() {
    const hook = getHook();
    if (!hook) return null;
    try {
      if (typeof hook.lastRun === 'function') return hook.lastRun();
      if (hook.lastRun) return hook.lastRun;
      if (hook.game?.lastRun) return hook.game.lastRun;
    } catch (error) {
      console.warn('[Bearproof] lastRun read failed:', error);
    }
    return null;
  }

  function bytesToBase64Url(value) {
    if (typeof value === 'string') return value;
    const bytes = value instanceof Uint8Array
      ? value
      : value instanceof ArrayBuffer
        ? new Uint8Array(value)
        : Array.isArray(value)
          ? Uint8Array.from(value)
          : null;
    if (!bytes) return null;
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  }

  function playerId() {
    let value = localStorage.getItem(PLAYER_ID_KEY);
    if (!value) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(PLAYER_ID_KEY, value);
    }
    return value;
  }

  function getSubmissionPayload() {
    const hook = getHook();
    const sim = getSimulation();
    const summary = hook?.summary?.();
    const run = getLastRun();
    if (!summary || !sim || !run) return { error: 'The page has not exposed a completed lastRun for submission.' };
    const log = bytesToBase64Url(run.bytes);
    if (!log) return { error: 'The page exposed run details but no replay log.' };
    if (!run.summary || !Number.isFinite(Number(run.seed))) return { error: 'The lastRun record is incomplete.' };
    const metadata = hook.runInfo || hook.session || {};
    const runSummary = run.summary;
    const payload = {
      v: 1,
      playerId: metadata.playerId || playerId(),
      name: metadata.name || localStorage.getItem(PLAYER_NAME_KEY) || 'Tampermonkey player',
      mode: run.mode || metadata.mode || 'free',
      build: Number(metadata.build || hook.build || BUILD),
      seed: Number(run.seed),
      stage: runSummary.stage,
      claimed: {
        score: runSummary.score,
        timeMs: runSummary.timeMs,
        kills: runSummary.kills,
        level: runSummary.level
      },
      durationMs: Number(run.durationMs || runSummary.timeMs),
      log
    };
    if (run.date || metadata.challengeDate) payload.challengeDate = run.date || metadata.challengeDate;
    return { payload };
  }

  async function submitRun() {
    if (submitted) return;
    const nameInput = panel?.querySelector('[data-player-name]');
    const name = String(nameInput?.value || '').trim();
    if (name) localStorage.setItem(PLAYER_NAME_KEY, name);
    const result = getSubmissionPayload();
    if (result.error) {
      setStatus(result.error, 'error');
      return;
    }
    submitButton.disabled = true;
    setStatus('Submitting verified replay…', 'waiting');
    try {
      const headers = { 'content-type': 'application/json' };
      const session = await fetch('/api/session', {
        method: 'POST', headers,
        body: JSON.stringify({ playerId: result.payload.playerId, build: result.payload.build, mode: result.payload.mode })
      });
      if (!session.ok) throw new Error(`Session setup failed (${session.status})`);
      const player = await fetch('/api/player', {
        method: 'POST', headers,
        body: JSON.stringify({ playerId: result.payload.playerId, name: result.payload.name })
      });
      if (!player.ok) throw new Error(`Player setup failed (${player.status})`);
      const response = await fetch('/api/runs', {
        method: 'POST', headers, body: JSON.stringify(result.payload)
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error?.message || data?.error || `API request failed (${response.status})`);
      submitted = true;
      setStatus(data?.rank ? `Submitted; board rank #${data.rank}.` : 'Submitted; verification pending.', 'done');
    } catch (error) {
      submitButton.disabled = false;
      setStatus(`Submission failed: ${error.message}`, 'error');
    }
  }

  function setStatus(text, kind) {
    if (!status) return;
    status.textContent = text;
    status.dataset.kind = kind || '';
  }

  function restorePlayer() {
    if (activeSim && activeSim.player && originalTimer !== null) {
      activeSim.player.invincibleTimer = originalTimer;
    }
    activeSim = null;
    originalTimer = null;
  }

  function disable(reason) {
    enabled = false;
    reached = reason === 'target';
    restorePlayer();
    if (reason === 'target') setStatus(`Target reached (${target.toLocaleString()}); normal death behavior restored.`, 'done');
    else if (reason === 'stopped') setStatus('Guard stopped; normal death behavior restored.', 'idle');
  }

  function enable() {
    target = readTarget();
    enabled = true;
    reached = false;
    setStatus(`Guard active below ${target.toLocaleString()}.`, 'active');
  }

  function tick() {
    const sim = getSimulation();
    if (!sim) {
      if (enabled) setStatus('Waiting for the __bearproof debug hook…', 'waiting');
      return;
    }

    if (sim !== activeSim) {
      restorePlayer();
      activeSim = sim;
      originalTimer = Number.isFinite(sim.player.invincibleTimer) ? sim.player.invincibleTimer : 0;
    }

    const score = Number(getHook().summary()?.score || 0);
    if (!enabled) {
      if (sim.over) restorePlayer();
      return;
    }
    if (sim.over) {
      disable('stopped');
      setStatus(`Run ended at ${score.toLocaleString()}; normal death behavior restored.`, 'idle');
      return;
    }
    if (score >= target) {
      disable('target');
      return;
    }

    // This changes only local simulation state; it does not alter the score or replay log.
    sim.player.invincibleTimer = Number.POSITIVE_INFINITY;
    setStatus(`Protected · ${score.toLocaleString()} / ${target.toLocaleString()}`, 'active');
  }

  function buildPanel() {
    const root = document.createElement('div');
    root.id = 'bearproof-target-guard';
    root.innerHTML = `
      <strong>Target-score guard</strong>
      <label>Target score <input type="number" min="1" step="1000" value="${target}"></label>
      <label>Board name <input data-player-name type="text" maxlength="16" value="${(localStorage.getItem(PLAYER_NAME_KEY) || '').replaceAll('"', '&quot;')}"></label>
      <div class="bsg-actions"><button type="button" data-action="start">Start guard</button><button type="button" data-action="stop">Stop</button><button type="button" data-action="submit">Submit run</button></div>
      <small data-status>Development debug hook only.</small>
    `;
    document.documentElement.appendChild(root);
    panel = root;
    status = root.querySelector('[data-status]');
    submitButton = root.querySelector('[data-action="submit"]');
    const input = root.querySelector('input');
    input.addEventListener('change', () => {
      const next = Number(input.value);
      if (!Number.isFinite(next) || next < 1) {
        input.value = String(target);
        return;
      }
      target = Math.floor(next);
      localStorage.setItem(STORAGE_KEY, String(target));
      if (enabled) enable();
    });
    root.querySelector('[data-action="start"]').addEventListener('click', enable);
    root.querySelector('[data-action="stop"]').addEventListener('click', () => disable('stopped'));
    submitButton.addEventListener('click', submitRun);
    setStatus(getHook() ? 'Ready.' : 'Waiting for __bearproof debug hook…', 'waiting');
  }

  function start() {
    GM_addStyle(`
      #bearproof-target-guard { position: fixed; z-index: 2147483647; top: 12px; right: 12px; width: 230px; padding: 12px; color: #d8ffe7; background: #101615ee; border: 1px solid #28e878; box-shadow: 0 4px 18px #0008; font: 12px/1.35 system-ui, sans-serif; }
      #bearproof-target-guard strong { display: block; margin-bottom: 8px; color: #28e878; }
      #bearproof-target-guard label { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 5px; }
      #bearproof-target-guard input { width: 100px; color: #d8ffe7; background: #17201d; border: 1px solid #527c63; padding: 3px 5px; }
      #bearproof-target-guard input[data-player-name] { width: 108px; }
      #bearproof-target-guard button { margin-top: 8px; margin-right: 5px; color: #07110b; background: #28e878; border: 0; padding: 5px 8px; cursor: pointer; }
      #bearproof-target-guard button[data-action="stop"] { color: #fff; background: #704040; }
      #bearproof-target-guard button[data-action="submit"] { color: #fff; background: #3465a4; }
      #bearproof-target-guard button:disabled { cursor: wait; opacity: .6; }
      #bearproof-target-guard small { display: block; margin-top: 8px; color: #b7c7bc; }
      #bearproof-target-guard small[data-kind="done"] { color: #ffd166; }
      #bearproof-target-guard small[data-kind="active"] { color: #28e878; }
      #bearproof-target-guard small[data-kind="error"] { color: #ff8a8a; }
    `);
    if (document.documentElement) buildPanel();
    else document.addEventListener('DOMContentLoaded', buildPanel, { once: true });
    pollHandle = window.setInterval(tick, POLL_MS);
    window.addEventListener('beforeunload', restorePlayer, { once: true });
  }

  start();
})();
