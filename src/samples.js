// Pre-baked high-fidelity sample scenes for instant testing & demonstration

export function generateSampleImage(type = 'cyberpunk', size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (type === 'cyberpunk') {
    // Cyberpunk portrait silhouette with neon backlighting
    const bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, '#0d0221');
    bg.addColorStop(0.5, '#0f084b');
    bg.addColorStop(1, '#05021a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // Neon circular halo
    const halo = ctx.createRadialGradient(size * 0.5, size * 0.45, size * 0.15, size * 0.5, size * 0.45, size * 0.45);
    halo.addColorStop(0, '#ff2a6d');
    halo.addColorStop(0.6, '#05d9e8');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.45, size * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Geometric silhouette
    ctx.fillStyle = '#050510';
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.42, size * 0.22, 0, Math.PI * 2); // head
    ctx.fill();

    // Shoulders
    ctx.beginPath();
    ctx.ellipse(size * 0.5, size * 0.85, size * 0.38, size * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neon cyber visor
    ctx.fillStyle = '#05d9e8';
    ctx.shadowColor = '#05d9e8';
    ctx.shadowBlur = 18;
    ctx.fillRect(size * 0.36, size * 0.38, size * 0.28, size * 0.07);
    ctx.shadowBlur = 0;

  } else if (type === 'statue') {
    // Classical sculpture with sharp directional chiaroscuro lighting
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, size, size);

    // Dramatic side key light
    const keyLight = ctx.createRadialGradient(size * 0.35, size * 0.35, size * 0.05, size * 0.5, size * 0.5, size * 0.45);
    keyLight.addColorStop(0, '#ffffff');
    keyLight.addColorStop(0.35, '#a0a0a0');
    keyLight.addColorStop(0.7, '#252528');
    keyLight.addColorStop(1, '#0a0a0c');
    ctx.fillStyle = keyLight;
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.48, size * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Facet lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(size * 0.5, size * 0.2);
    ctx.lineTo(size * 0.45, size * 0.55);
    ctx.lineTo(size * 0.58, size * 0.55);
    ctx.stroke();

  } else if (type === 'waves') {
    // Pulsar / Joy Division inspired topographic frequency lines
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    const grad = ctx.createRadialGradient(size * 0.5, size * 0.5, 10, size * 0.5, size * 0.5, size * 0.4);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#777777');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}
