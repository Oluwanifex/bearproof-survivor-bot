// ==UserScript==
// @name         Bearproof target-score guard
// @namespace    bearproof-survivor-bot
// @version      1.1.0
// @description  Bearproof development helper: keep the exposed simulation alive until a target score, then restore normal death behavior.
// @match        http://localhost/*
// @match        http://127.0.0.1/*
// @match        http://bearproof.app/*
// @match        https://bearproof.app/*
// @match        http://www.bearproof.app/*
// @match        https://www.bearproof.app/*
// @run-at       document-start
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  const page = window;
  const STORAGE_KEY = 'bearproof-target-score';
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
      <div class="bsg-actions"><button type="button" data-action="start">Start guard</button><button type="button" data-action="stop">Stop</button></div>
      <small data-status>Development debug hook only.</small>
    `;
    document.documentElement.appendChild(root);
    panel = root;
    status = root.querySelector('[data-status]');
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
    setStatus(getHook() ? 'Ready.' : 'Waiting for __bearproof debug hook…', 'waiting');
  }

  function start() {
    GM_addStyle(`
      #bearproof-target-guard { position: fixed; z-index: 2147483647; top: 12px; right: 12px; width: 230px; padding: 12px; color: #d8ffe7; background: #101615ee; border: 1px solid #28e878; box-shadow: 0 4px 18px #0008; font: 12px/1.35 system-ui, sans-serif; }
      #bearproof-target-guard strong { display: block; margin-bottom: 8px; color: #28e878; }
      #bearproof-target-guard label { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      #bearproof-target-guard input { width: 100px; color: #d8ffe7; background: #17201d; border: 1px solid #527c63; padding: 3px 5px; }
      #bearproof-target-guard button { margin-top: 8px; margin-right: 5px; color: #07110b; background: #28e878; border: 0; padding: 5px 8px; cursor: pointer; }
      #bearproof-target-guard button[data-action="stop"] { color: #fff; background: #704040; }
      #bearproof-target-guard small { display: block; margin-top: 8px; color: #b7c7bc; }
      #bearproof-target-guard small[data-kind="done"] { color: #ffd166; }
      #bearproof-target-guard small[data-kind="active"] { color: #28e878; }
    `);
    if (document.documentElement) buildPanel();
    else document.addEventListener('DOMContentLoaded', buildPanel, { once: true });
    pollHandle = window.setInterval(tick, POLL_MS);
    window.addEventListener('beforeunload', restorePlayer, { once: true });
  }

  start();
})();
