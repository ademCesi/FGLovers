precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_bins[64];
uniform float u_bass;
uniform float u_mids;
uniform float u_highs;



const float PI = 3.14159265;

float hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p.x + p.y) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

vec3 palette(float t) {
  return 0.5 + 0.5 * cos(6.2831 * (vec3(0.98, 0.50, 0.25) * t + vec3(0.02, 0.23, 0.45)));
}

void main() {



  // cercle principal
  vec2 centered =
      (2.0 * gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);

  float t_cos = cos(u_time * 200.0);
  float t_sin = sin(u_time * 0.5) + t_cos * 0.2;
  float r = length(centered);
  float ang = atan(centered.y, centered.x);
  ang = abs(fract((ang / (2.0 * PI)) * 6.0) - 0.5) * (2.0 * PI) / 6.0;
  float swirl = sin(r * 12.0 - u_time * 1.5) * 0.12 * (0.5 + u_highs);
  vec2 warped = vec2(cos(ang + swirl), sin(ang + swirl)) * r;

  // cerlce basse
  float rayon = 0.3 * u_bass * 1.0;
  float dist = length(centered * t_sin);
  float circle_basse = smoothstep(rayon, rayon - 0.01, dist);

  // cerlce mid
  rayon = 0.5 * u_mids * 1.0;
  dist = length(centered * t_sin);
  float circle_mid = smoothstep(rayon, rayon - 0.01, dist);

  // cerlce haute
  rayon = 0.3 * u_highs * 1.0;
  dist = length(centered * t_sin);
  float circle_high = smoothstep(rayon, rayon - 0.01, dist);

  // vagues
  float wave = sin(20.0 * dist * 3.0) * 3.0 * ( u_bass * u_mids * u_highs );


  float circle = circle_basse + circle_mid + circle_high + ( wave * sin( u_time * 0.5 )) ;


  // couleur
  float strobe = 0.7 + 0.6 * sin(u_time * 30.0 + u_bass * 4.0);
  vec3 pulse = palette(u_time * 0.1 + circle * 2.0 + u_highs * 0.5);
  vec4 col_cercle = vec4(pulse * strobe, 1.0) * clamp(circle, 0.0, 1.5);

  float alpha = 1.0 - smoothstep(0.0, 1.0, length(centered)  / 1.0+(t_sin * 0.1));
  col_cercle *=  alpha;
  // cercle principal end

  
  vec2 uv = warped * 1.8 + vec2(t_sin, t_cos) * 0.02;
  float clouds = fbm(uv * 2.0 + vec2(u_time * 0.05, u_time * 0.02 + u_mids * 0.1));
  float lightAccum = 0.0;
  float bassPulse = smoothstep(0.6, 1.0, u_bass);
  float aspect = u_resolution.x / u_resolution.y;
  for (int i = 0; i < 25; i++) {
    float fi = float(i);
    vec2 lp = vec2(
        hash(vec2(fi, floor(u_time * 0.3))) * 2.0 - 1.0,
        hash(vec2(fi + 10.0, floor(u_time * 0.3) + 5.0)) * 2.0 - 1.0);
    lp.x *= aspect;
    float d = length(centered - lp);
    float flicker = bassPulse * (0.5 + 0.5 * sin(u_time * 8.0 + fi * 2.0));
    lightAccum += exp(-d * 12.0) * flicker;
  }
  clouds = clamp(clouds + lightAccum * 0.5, 0.0, 1.0);
  vec3 bg = mix(vec3(0.02, 0.01, 0.05), vec3(0.18, 0.09, 0.25), clouds);
  bg += lightAccum * vec3(0.9, 0.65, 0.3);
  bg = mix(bg, palette(clouds + u_time * 0.2), 0.4 * (u_highs + 0.1));
  bg += sin(uv.y * 40.0 + u_time * 6.0) * 0.02;
  bg += palette(r * 4.0 + u_time * 1.2) * (0.2 * bassPulse + 0.1 * u_highs);
  bg += vec3(sin((centered.x + centered.y) * 80.0 + u_time * 15.0)) * 0.05;

  vec4 background = vec4(bg, 1.0);

    // cool test effect (fait au tatonnement , aucun idée de pourquoi ca marche) 
  vec2 origin = vec2(0.0, -1.0);
  vec3 beam = vec3(0.1, 1.0, 0.35);
  for (int j = 0; j < 2; j++) {
    float fj = float(j);
    float side = (fj < 3.0) ? -1.0 : 1.0;
    float spread = (mod(fj, 3.0) - 1.0) * 0.2;
    vec2 dir = normalize(vec2(side * (0.25 + 0.1 * spread), 1.0));
    vec2 rel = centered - origin;
    float along = max(0.0, dot(rel, dir));
    float perp = abs(rel.x * dir.y - rel.y * dir.x);
    float beam = exp(-perp * 60.0) * exp(-along * 2.5);
    beam *= bassPulse * (0.5 + 0.5 * sin(u_time * 14.0 + fj * 1.7));
  }


  vec3 finalCol = mix(background.rgb, col_cercle.rgb * 0.6, col_cercle.a);

  finalCol += mix(beam, finalCol, beam.g);

  finalCol = vec3(
      finalCol.r * (0.9 + 0.3 * sin(u_time * 25.0 + r * 8.0)),
      finalCol.g * (0.9 + 0.3 * sin(u_time * 27.0 + ang * 10.0)),
      finalCol.b * (0.9 + 0.3 * sin(u_time * 29.0 - r * 12.0)));

  

  gl_FragColor = vec4(finalCol, 1.0);
}
