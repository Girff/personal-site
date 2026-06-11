/* Swirling paint background — WebGL recreation of the Balatro-style vortex shader.
   Falls back to a CSS gradient (body.no-webgl) if WebGL is unavailable. */
(function () {
  'use strict';

  var canvas = document.getElementById('bg-shader');
  if (!canvas) return;

  var gl = canvas.getContext('webgl', { antialias: false, depth: false, alpha: false });
  if (!gl) {
    document.body.classList.add('no-webgl');
    canvas.remove();
    return;
  }

  var VERT = [
    'attribute vec2 p;',
    'void main() { gl_Position = vec4(p, 0.0, 1.0); }'
  ].join('\n');

  // Classic paint-mix vortex: polar swirl + iterative sin/cos smudging,
  // quantized to chunky pixels. Three colours, same trio Balatro fans know.
  var FRAG = [
    'precision highp float;',
    'uniform float u_time;',
    'uniform vec2 u_res;',
    '',
    '#define SPIN_ROTATION -2.0',
    '#define SPIN_SPEED 4.0',
    '#define COLOUR_1 vec4(0.871, 0.267, 0.231, 1.0)', // red    #DE443B
    '#define COLOUR_2 vec4(0.0, 0.42, 0.706, 1.0)',    // blue   #006BB4
    '#define COLOUR_3 vec4(0.086, 0.137, 0.145, 1.0)', // dark   #162325
    '#define CONTRAST 3.5',
    '#define LIGHTING 0.4',
    '#define SPIN_AMOUNT 0.25',
    '#define PIXEL_FILTER 620.0',
    '#define SPIN_EASE 1.0',
    '',
    'void main() {',
    '  vec2 screenSize = u_res;',
    '  vec2 screen_coords = gl_FragCoord.xy;',
    '  float pixel_size = length(screenSize) / PIXEL_FILTER;',
    '  vec2 uv = (floor(screen_coords * (1.0 / pixel_size)) * pixel_size - 0.5 * screenSize) / length(screenSize);',
    '  float uv_len = length(uv);',
    '',
    '  float speed = (SPIN_ROTATION * SPIN_EASE * 0.2) + 302.2;',
    '  float new_pixel_angle = atan(uv.y, uv.x) + speed',
    '    - SPIN_EASE * 20.0 * (SPIN_AMOUNT * uv_len + (1.0 - SPIN_AMOUNT));',
    '  vec2 mid = (screenSize / length(screenSize)) / 2.0;',
    '  uv = vec2(uv_len * cos(new_pixel_angle) + mid.x, uv_len * sin(new_pixel_angle) + mid.y) - mid;',
    '',
    '  uv *= 30.0;',
    '  speed = u_time * SPIN_SPEED;',
    '  vec2 uv2 = vec2(uv.x + uv.y);',
    '',
    '  for (int i = 0; i < 5; i++) {',
    '    uv2 += sin(max(uv.x, uv.y)) + uv;',
    '    uv += 0.5 * vec2(cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121), sin(uv2.x - 0.113 * speed));',
    '    uv -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);',
    '  }',
    '',
    '  float contrast_mod = (0.25 * CONTRAST + 0.5 * SPIN_AMOUNT + 1.2);',
    '  float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));',
    '  float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));',
    '  float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));',
    '  float c3p = 1.0 - min(1.0, c1p + c2p);',
    '  float light = (LIGHTING - 0.2) * max(c1p * 5.0 - 4.0, 0.0) + LIGHTING * max(c2p * 5.0 - 4.0, 0.0);',
    '',
    '  vec4 col = (0.3 / CONTRAST) * COLOUR_1',
    '    + (1.0 - 0.3 / CONTRAST) * (COLOUR_1 * c1p + COLOUR_2 * c2p + vec4(c3p * COLOUR_3.rgb, c3p * COLOUR_1.a))',
    '    + light;',
    '  gl_FragColor = vec4(col.rgb, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh) || 'shader compile failed');
    }
    return sh;
  }

  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link failed');
  } catch (e) {
    document.body.classList.add('no-webgl');
    canvas.remove();
    return;
  }

  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uTime = gl.getUniformLocation(prog, 'u_time');
  var uRes = gl.getUniformLocation(prog, 'u_res');

  // render at reduced resolution — the shader is chunky-pixel anyway
  var SCALE = 0.6;

  function resize() {
    var w = Math.max(1, Math.floor(innerWidth * SCALE));
    var h = Math.max(1, Math.floor(innerHeight * SCALE));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var start = performance.now();
  var raf = null;

  function draw(now) {
    resize();
    var t = reduced ? 12.0 : (now - start) / 1000;
    gl.uniform1f(uTime, t);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduced) raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(draw);

  addEventListener('resize', function () {
    if (reduced) requestAnimationFrame(draw); // re-render the still frame
  });

  document.addEventListener('visibilitychange', function () {
    if (reduced) return;
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    } else if (!raf) {
      raf = requestAnimationFrame(draw);
    }
  });
})();
