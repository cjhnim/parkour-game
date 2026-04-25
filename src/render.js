// Canvas rendering. Side-effectful.

import { SCREEN_W, SCREEN_H, PLAYER_W, PLAYER_H } from './level.js';

export function createRenderer(canvas) {
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const ctx = canvas.getContext('2d');

  function clear() {
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }

  function drawSolids(solids) {
    ctx.fillStyle = '#3d3d52';
    for (const s of solids) ctx.fillRect(s.x, s.y, s.w, s.h);
  }

  function drawGoal(goal) {
    if (!goal) return;
    ctx.fillStyle = '#f5d76e';
    ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GOAL', goal.x + goal.w / 2, goal.y + goal.h / 2 + 5);
  }

  function drawPlayer(player, vx = 0) {
    const { x, y, w, h } = player;
    // SVG 콘텐츠: 너비 24, 높이 20 (y=0~20) — 가로세로 스케일 분리
    const px = n => Math.round(n * w / 24);
    const py = n => Math.round(n * h / 20);
    const eyeShift = vx > 0 ? px(1.5) : vx < 0 ? -px(1.5) : 0;

    ctx.fillStyle = '#D97757';
    ctx.fillRect(x + px(3),   y + py(5),  px(18), py(12)); // 몸통
    ctx.fillRect(x,            y + py(11), px(3),  py(3));  // 왼팔
    ctx.fillRect(x + px(21),  y + py(11), px(3),  py(3));  // 오른팔
    ctx.fillRect(x + px(4.5), y + py(17), px(1.5), py(3)); // 발 왼쪽 바깥
    ctx.fillRect(x + px(7.5), y + py(17), px(1.5), py(3)); // 발 왼쪽 안쪽
    ctx.fillRect(x + px(15),  y + py(17), px(1.5), py(3)); // 발 오른쪽 안쪽
    ctx.fillRect(x + px(18),  y + py(17), px(1.5), py(3)); // 발 오른쪽 바깥
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(x + px(6)    + eyeShift, y + py(8), px(1.5), py(3)); // 왼눈
    ctx.fillRect(x + px(16.5) + eyeShift, y + py(8), px(1.5), py(3)); // 오른눈
  }

  function drawHud({ stageName, time, status, hint }) {
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(stageName, 30, 40);
    ctx.textAlign = 'right';
    ctx.fillText(`${time.toFixed(2)}s`, SCREEN_W - 30, 40);

    if (hint) {
      ctx.fillStyle = '#aaa';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hint, SCREEN_W / 2, SCREEN_H - 15);
    }

    if (status) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, SCREEN_H / 2 - 60, SCREEN_W, 120);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(status.title, SCREEN_W / 2, SCREEN_H / 2 - 5);
      ctx.font = '14px monospace';
      ctx.fillText(status.subtitle, SCREEN_W / 2, SCREEN_H / 2 + 25);
    }
  }

  // Simulates one route step's leading-edge trajectory and returns absolute (x, y) points.
  // Mirrors validator semantics: x = player's leading edge in vxDir, y = feet y.
  function simulateStep(step, cfg) {
    const pts = [];
    const t = step.takeoff;

    if (step.type === 'jump' || step.type === 'wall-touch') {
      if (!t) return pts;
      const vxDir = t.vxDir ?? 0;
      let x = t.x, y = t.y;
      // For 'jump' steps targeting a platform, pick vx so contact happens near peak y
      // (cleaner visual). Player can pick any vx in [0, moveSpeed] via input control.
      let vx;
      if (step.type === 'jump' && step.targetPlatform && vxDir !== 0) {
        const tp = step.targetPlatform;
        const dx = vxDir > 0 ? tp.x - t.x : (tp.x + tp.w) - t.x;
        const peakFrame = Math.max(1, Math.round(-cfg.jumpVelocity / cfg.gravity));
        const optimal = dx / peakFrame;
        vx = Math.max(-cfg.moveSpeed, Math.min(cfg.moveSpeed, optimal));
      } else {
        vx = vxDir * cfg.moveSpeed;
      }
      let vy = cfg.jumpVelocity;
      pts.push({ x, y });
      for (let f = 0; f < 200; f++) {
        vy = Math.min(vy + cfg.gravity, cfg.maxFallSpeed);
        x += vx;
        y += vy;
        pts.push({ x, y });
        if (step.type === 'jump' && step.targetPlatform) {
          const tp = step.targetPlatform;
          const pLeft  = vxDir > 0 ? x - PLAYER_W : vxDir < 0 ? x : x - PLAYER_W / 2;
          const pRight = vxDir > 0 ? x : vxDir < 0 ? x + PLAYER_W : x + PLAYER_W / 2;
          if (pRight >= tp.x && pLeft <= tp.x + tp.w &&
              y >= tp.y && (y - PLAYER_H) <= tp.y + tp.h) break;
        } else if (step.type === 'wall-touch') {
          if (Math.abs(x - t.x) >= step.horizontalGap) break;
        }
        if (y > t.y + 600) break;
      }
    } else if (step.type === 'wall-jump-land') {
      const side = step.wallSide;
      let x = step.wallX - side * (PLAYER_W / 2);
      let y = step.wallTouchY;
      let vx = -side * cfg.wallJumpVx;
      let vy = cfg.wallJumpVy;
      const tp = step.targetPlatform;
      pts.push({ x, y });
      for (let f = 0; f < 200; f++) {
        const prevY = y;
        vy = Math.min(vy + cfg.gravity, cfg.maxFallSpeed);
        x += vx;
        y += vy;
        pts.push({ x, y });
        if (vy > 0 && prevY < tp.y && y >= tp.y) {
          if (x + PLAYER_W / 2 >= tp.x && x - PLAYER_W / 2 <= tp.x + tp.w) break;
        }
        if (y > tp.y + 400) break;
      }
    }
    return pts;
  }

  function drawRoute(stage, cfg) {
    if (!stage?.route) return;
    ctx.save();
    ctx.strokeStyle = '#5fc4ff';
    ctx.fillStyle = '#5fc4ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    for (const step of stage.route) {
      const pts = simulateStep(step, cfg);
      if (pts.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.setLineDash([]);
      // Start dot
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, 3, 0, Math.PI * 2);
      ctx.fill();
      // Player bbox at contact frame — line is feet/leading-edge but player has volume.
      const end = pts[pts.length - 1];
      const dir = step.takeoff?.vxDir ?? (step.wallSide ? -step.wallSide : 0);
      const bx = dir > 0 ? end.x - PLAYER_W : dir < 0 ? end.x : end.x - PLAYER_W / 2;
      const by = end.y - PLAYER_H;
      ctx.strokeRect(bx, by, PLAYER_W, PLAYER_H);
      ctx.setLineDash([6, 4]);
    }
    ctx.restore();
  }

  return { clear, drawSolids, drawGoal, drawPlayer, drawHud, drawRoute };
}
