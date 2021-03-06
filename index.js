



let container, controls, camera, scene, renderer, geom, object, pointMaterial, faceMaterial, lineMaterial, panelMaterial, raycaster, mouse, sphere;

let panels = [];

let select = document.getElementById('panelSelect');
let info2 = document.getElementById('info2');

select.onchange = onSelectChange;

mouse = new THREE.Vector2();



init();

function onSelectChange(event) {
  let idx = parseInt(event.target.value);
  for (let i = 0; i < panels.length; ++i) {
    panels[i].faces.visible = i === idx;
    for (let line of panels[i].lines) {
      line.material = i === idx ? panelMaterial : lineMaterial;
    }

  }
  // surface area
  let area = 0;
  for (let face of panels[idx].faces.geometry.faces) {
    let a = panels[idx].faces.geometry.vertices[face.a];
    let b = panels[idx].faces.geometry.vertices[face.b];
    let c = panels[idx].faces.geometry.vertices[face.c];
    let u = b.clone().sub(a);
    let v = c.clone().sub(a);
    area += Math.sqrt((u.y * v.z - u.z * v.y) ** 2 + (u.z * v.x - u.x * v.z) ** 2 + (u.x * v.y - u.y * v.x) ** 2) / 2;
  }
  info2.innerText = `Total surface area: ${(area / 144).toFixed(2)} sq. ft.`;
}

function onMouseMove(event) {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}


function init() {
  container = document.createElement('div');
  container.addEventListener('mousemove', onMouseMove, false);
  document.body.appendChild(container);
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.z = 1000;
  controls = new THREE.OrbitControls(camera, container);
  scene = new THREE.Scene();
  pointMaterial = new THREE.PointsMaterial({ color: 0xffffff });
  lineMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });
  panelMaterial = new THREE.LineBasicMaterial({ color: 0xff4444 });
  faceMaterial = new THREE.MeshBasicMaterial({ color: 0xaa0000, });
  faceMaterial.side = THREE.DoubleSide;
  faceMaterial.transparent = true;
  faceMaterial.opacity = 0.3;
  scene.add(camera);
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
  geom = new THREE.Geometry();
  raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 1;
  sphere = new THREE.Mesh(new THREE.SphereBufferGeometry(1, 32, 32), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
  scene.add(sphere);
  fetch('newsheep_processed.obj')
  .then((res) => {
    return res.text();
  })
  .then((body) => {
    body
    .split('\n')
    .filter(line => line.trim() && /^[vflg]\s/.test(line))
    .map(line => line.trim())
    .forEach(line => {
      if (/^v\s/.test(line)) {
        let coords = /^v\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)/.exec(line);
        if (!coords) throw new Error(`invalid vertex line: ${line}`);
        geom.vertices.push(new THREE.Vector3(parseFloat(coords[1]), parseFloat(coords[2]), parseFloat(coords[3])));
      } else if (/^g\s/.test(line)) {
        panels.push({
          name: line.replace(/^g\s+/, '').replace(/^G_([^_]+).*?$/, '$1'),
          faces: new THREE.Geometry(),
          lines: []
        });
        select.options[select.options.length] = new Option(panels[panels.length - 1].name, (panels.length - 1).toString());
      } else if (/^f\s/.test(line)) {
        let verts = line.replace(/^f\s+/, '').split(/\s+/).map(v => parseInt(v) - 1);
        let localVerts = [];
        for (let vi of verts) {
          let v = geom.vertices[vi];
          let lvi = panels[panels.length - 1].faces.vertices.indexOf(v);
          if (lvi === -1) {
            lvi = panels[panels.length - 1].faces.vertices.length;
            panels[panels.length - 1].faces.vertices.push(v);
          }
          localVerts.push(lvi);
        }
        panels[panels.length - 1].faces.faces.push(new THREE.Face3(...localVerts));
        // faceGeo.vertices.push(geom.vertices[verts[0]]);
        // panels[panels.length -1].faces.push(new THREE.Line(faceGeo, lineMaterial));
        // scene.add(panels[panels.length -1].faces[panels[panels.length -1].faces.length - 1]);
      } else if (/^l\s/.test(line)) {
        let verts = line.replace(/^l\s+/, '').split(/\s+/).map(v => parseInt(v) - 1);
        let lineGeo = new THREE.Geometry();
        for (let vi of verts) {
          let v = geom.vertices[vi];
          lineGeo.vertices.push(v);
        }
        panels[panels.length - 1].lines.push(lineGeo);
      }
    });

    panels.forEach((panel) => {
      panel.faces = new THREE.Mesh(panel.faces, faceMaterial);
      panel.faces.visible = false;
      scene.add(panel.faces);
      panel.lines = panel.lines.map(line => new THREE.Line(line, lineMaterial));
      panel.lines.forEach((line) => {
        scene.add(line);
      });
    });
    geom.computeBoundingSphere();
    object = new THREE.Points(geom, pointMaterial);
    scene.add(object);
    controls.target = geom.boundingSphere.center;
    camera.lookAt(geom.boundingSphere.center);




    render();
  });
}

function render() {
  requestAnimationFrame(render);
  controls.update();
  raycaster.setFromCamera(mouse, camera);
  let intersections = raycaster.intersectObject(object);
  if (intersections.length) {
    let sorted = object.geometry.vertices.slice().sort((a, b) => (new THREE.Vector3()).subVectors(a, intersections[0].point).length() - (new THREE.Vector3()).subVectors(b, intersections[0].point).length());
    let nearest = sorted[0];
    sphere.position.copy(nearest);
    sphere.visible = true;
    let index = object.geometry.vertices.indexOf(nearest);
    document.getElementById('info').innerText = (index+1).toString();
  } else {
    sphere.visible = false;
    document.getElementById('info').innerText = '';
  }
  renderer.render(scene, camera);
}