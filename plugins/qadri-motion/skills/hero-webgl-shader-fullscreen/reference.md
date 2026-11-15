# Reference: Full-Viewport WebGL Shader Hero

## GLSL noise function library

### Hash functions
```glsl
// 1D hash
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; return fract(p * (p + p)); }
// 2D -> 1D hash
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// 2D -> 2D hash (for Voronoi)
vec2 hash22(vec2 p) { p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
```

### Value noise
```glsl
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), f.x),
             mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), f.x), f.y);
}
```

### Simplex-like gradient noise (2D)
```glsl
vec2 grad(vec2 p) { float h = hash21(p); return vec2(cos(h*6.2832), sin(h*6.2832)); }
float gnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(dot(grad(i), f), dot(grad(i+vec2(1,0)), f-vec2(1,0)), u.x),
             mix(dot(grad(i+vec2(0,1)), f-vec2(0,1)), dot(grad(i+vec2(1,1)), f-vec2(1,1)), u.x), u.y);
}
```

### Fractional Brownian motion (fbm)
```glsl
float fbm(vec2 p, int octaves) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8); // rotation breaks grid alignment between octaves
  for (int i = 0; i < octaves; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.0;
    a *= 0.5;
  }
  return v;
}
```

### Domain warping
```glsl
float warpedNoise(vec2 p, float t) {
  vec2 q = vec2(fbm(p + vec2(0.0, 0.0) + t*0.1, 5),
                fbm(p + vec2(5.2, 1.3) + t*0.1, 5));
  vec2 r = vec2(fbm(p + 4.0*q + vec2(1.7, 9.2) + t*0.05, 5),
                fbm(p + 4.0*q + vec2(8.3, 2.8) + t*0.05, 5));
  return fbm(p + 4.0*r, 5);
}
```

## SDF raymarching recipe

Complete raymarcher for metaballs/organic shapes:
```glsl
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }

float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5*(d2-d1)/k, 0.0, 1.0);
  return mix(d2, d1, h) - k*h*(1.0-h);
}

float scene(vec3 p) {
  float t = uTime * 0.5;
  float s1 = sdSphere(p, 0.6);
  float s2 = sdSphere(p - vec3(sin(t)*0.8, cos(t*0.7)*0.4, 0.0), 0.4);
  float s3 = sdSphere(p - vec3(-sin(t*0.6)*0.5, -cos(t*0.8)*0.6, sin(t*0.3)*0.3), 0.35);
  return opSmoothUnion(opSmoothUnion(s1, s2, 0.4), s3, 0.3);
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(scene(p+e.xyy)-scene(p-e.xyy),
                        scene(p+e.yxy)-scene(p-e.yxy),
                        scene(p+e.yyx)-scene(p-e.yyx)));
}

vec4 raymarch(vec2 uv) {
  vec3 ro = vec3(0.0, 0.0, 2.5); // camera
  vec3 rd = normalize(vec3(uv, -1.5)); // ray direction
  float t = 0.0;
  for (int i = 0; i < 64; i++) {
    vec3 p = ro + rd * t;
    float d = scene(p);
    if (d < 0.001) {
      vec3 n = calcNormal(p);
      vec3 light = normalize(vec3(1.0, 1.0, 1.0));
      float diff = max(dot(n, light), 0.0);
      float spec = pow(max(dot(reflect(-light, n), -rd), 0.0), 32.0);
      vec3 col = vec3(0.15, 0.25, 0.55) * diff + vec3(1.0) * spec * 0.5;
      return vec4(col, 1.0);
    }
    if (t > 10.0) break;
    t += d;
  }
  return vec4(0.0); // miss
}
```

## Iq's palette function
```glsl
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}
// Presets:
// Rainbow: palette(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67))
// Sunset:  palette(t, vec3(0.5), vec3(0.5), vec3(1.0, 1.0, 0.5), vec3(0.8, 0.9, 0.3))
// Ocean:   palette(t, vec3(0.5), vec3(0.5), vec3(1.0, 0.7, 0.4), vec3(0.0, 0.15, 0.2))
```

## WebGL1 fallback (for older iOS Safari)

Replace the vertex shader:
```glsl
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
```
You need a vertex buffer with the fullscreen triangle coords since WebGL1 has no `gl_VertexID`:
```js
const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
const loc = gl.getAttribLocation(program, 'aPos');
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
```
Replace fragment shader header: remove `#version 300 es`, change `out vec4 O;` to use `gl_FragColor`, change `O=` to `gl_FragColor=`.

## Precision troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Banding in noise on mobile | mediump rounds hash constants | Use smaller magic numbers or normalize inputs |
| Solid color output on some Android | Integer overflow in hash | Replace `43758.5453` with `4375.85453` and adjust normalization |
| Shimmer/aliasing at edges | Insufficient precision in SDF distance | Use `highp` for distance field, `mediump` for color |
| Performance collapse on older mobile | highp emulated in software | Check `gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)` and fall back |

## Uniform best practices

| Uniform | Type | Update frequency | Note |
|---|---|---|---|
| uTime | float | Every frame | Seconds since init, minus paused time |
| uResolution | vec2 | On resize only | Backing-store pixels, not CSS pixels |
| uScroll | float | On scroll (passive) | Normalized 0-1 |
| uPointer | vec2 | On pointermove (passive) | Normalized -1 to 1, Y inverted |
| uDpr | float | On resize only | Useful for anti-aliasing decisions inside shader |
