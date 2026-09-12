/**
 * THE BUILDING OF AYUSH - script.js
 * Elite Architectural Visualization & Construction Workflow Engine
 * Plain JavaScript, Three.js, GSAP.
 */

(function initPortfolioArchitecture() {
    "use strict";

    // ==================================================
    // 1. BOOTSTRAP & DEPENDENCY INJECTION
    // ==================================================
    const PREFERS_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const STATE = {
        scrollProgress: 0,
        smoothedProgress: 0,
        mode: 'construction', // 'construction', 'blueprint', 'architectural'
        time: 0,
        isLoaded: false
    };

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load: ${src}`));
            document.head.appendChild(script);
        });
    }

    function updateLoader(id, percent) {
        const el = document.getElementById(id);
        if (el) el.textContent = `${Math.round(percent)}%`;
    }

    async function boot() {
        try {
            updateLoader('load-arch', 10);
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
            updateLoader('load-arch', 100);
            
            updateLoader('load-topo', 10);
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js');
            updateLoader('load-topo', 100);
            
            updateLoader('load-grid', 50);
            
            // Allow a small tick for the DOM to update before heavy synchronous setup
            setTimeout(() => {
                initEngine();
                updateLoader('load-grid', 100);
            }, 50);

        } catch (e) {
            console.error("Engine Boot Failure:", e);
            document.getElementById('loading-overlay').innerHTML = `<h1 style="color:red">INITIALIZATION FAILED</h1><p>${e.message}</p>`;
        }
    }

    // ==================================================
    // 2. PROCEDURAL MATERIAL GENERATOR
    // ==================================================
    // We use highly sophisticated 2D canvas generation to create physically plausible 
    // Albedo, Roughness, and Normal maps without relying on external CDNs which might fail.
    
    function createFractalNoise(ctx, width, height, scale, octaves, persistance) {
        const data = ctx.createImageData(width, height);
        const buf = new Uint32Array(data.data.buffer);
        
        // Simple hash-based PRNG
        const hash = (x, y, seed) => {
            let h = seed + x * 374761393 + y * 668265263;
            h = (h ^ (h >> 13)) * 1274126177;
            return h ^ (h >> 16);
        };

        const noise = (x, y, s) => {
            const ix = Math.floor(x), iy = Math.floor(y);
            const fx = x - ix, fy = y - iy;
            const h00 = hash(ix, iy, s), h10 = hash(ix + 1, iy, s);
            const h01 = hash(ix, iy + 1, s), h11 = hash(ix + 1, iy + 1, s);
            
            const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
            
            const n0 = (h00 / 4294967296) * (1 - ux) + (h10 / 4294967296) * ux;
            const n1 = (h01 / 4294967296) * (1 - ux) + (h11 / 4294967296) * ux;
            return n0 * (1 - uy) + n1 * uy;
        };

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let val = 0;
                let amp = 1.0;
                let freq = scale;
                let max = 0;
                
                for (let o = 0; o < octaves; o++) {
                    val += noise(x * freq, y * freq, 1337) * amp;
                    max += amp;
                    amp *= persistance;
                    freq *= 2;
                }
                val /= max;
                
                const c = Math.floor(val * 255);
                buf[y * width + x] = (255 << 24) | (c << 16) | (c << 8) | c;
            }
        }
        ctx.putImageData(data, 0, 0);
    }

    function generateMaterialMaps(type) {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        createFractalNoise(ctx, size, size, 0.02, 5, 0.5);
        
        // Base Noise Texture
        const noiseTex = new THREE.CanvasTexture(canvas);
        noiseTex.wrapS = THREE.RepeatWrapping;
        noiseTex.wrapT = THREE.RepeatWrapping;

        // Customize based on material type
        if (type === 'concrete') {
            const mat = new THREE.MeshStandardMaterial({
                color: 0x8a8d8f,
                roughnessMap: noiseTex,
                roughness: 0.8,
                metalness: 0.1,
                bumpMap: noiseTex,
                bumpScale: 0.02
            });
            return mat;
        } else if (type === 'plywood') {
            createFractalNoise(ctx, size, size, 0.01, 3, 0.3); // Stretched noise for wood grain
            ctx.fillStyle = "rgba(139, 90, 43, 0.7)"; // Wood tint
            ctx.fillRect(0,0,size,size);
            const woodTex = new THREE.CanvasTexture(canvas);
            woodTex.wrapS = THREE.RepeatWrapping; woodTex.wrapT = THREE.RepeatWrapping;
            return new THREE.MeshStandardMaterial({
                color: 0x8b5a2b,
                map: woodTex,
                roughness: 0.9,
                bumpMap: woodTex,
                bumpScale: 0.05
            });
        } else if (type === 'rebar') {
            return new THREE.MeshStandardMaterial({
                color: 0x5c3a21, // Rusty
                roughness: 0.9,
                metalness: 0.6,
                bumpMap: noiseTex,
                bumpScale: 0.1
            });
        } else if (type === 'soil') {
            return new THREE.MeshStandardMaterial({
                color: 0x3d2b1f,
                roughnessMap: noiseTex,
                roughness: 1.0,
                bumpMap: noiseTex,
                bumpScale: 0.2
            });
        } else if (type === 'asphalt') {
            return new THREE.MeshStandardMaterial({
                color: 0x222222,
                roughnessMap: noiseTex,
                roughness: 0.9,
                bumpMap: noiseTex,
                bumpScale: 0.05
            });
        }
        
        return new THREE.MeshStandardMaterial({ color: 0xffffff });
    }

    // ==================================================
    // 3. CORE ENGINE SETUP
    // ==================================================
    function initEngine() {
        const container = document.getElementById('webgl-container');
        const scene = new THREE.Scene();
        
        // Photorealistic Atmosphere
        scene.background = new THREE.Color(0xb0c4de);
        scene.fog = new THREE.FogExp2(0xb0c4de, 0.0025);

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 2000);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        container.appendChild(renderer.domElement);

        // --- Cinematic Lighting ---
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        hemiLight.position.set(0, 200, 0);
        scene.add(hemiLight);

        const sunLight = new THREE.DirectionalLight(0xfff5e6, 2.0); // Warm sun
        sunLight.position.set(100, 150, 50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 4096;
        sunLight.shadow.mapSize.height = 4096;
        sunLight.shadow.camera.near = 10;
        sunLight.shadow.camera.far = 400;
        const d = 80;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;
        sunLight.shadow.bias = -0.0005;
        scene.add(sunLight);

        // --- Materials Setup ---
        const mats = {
            concrete: generateMaterialMaps('concrete'),
            rebar: generateMaterialMaps('rebar'),
            formwork: generateMaterialMaps('plywood'),
            soil: generateMaterialMaps('soil'),
            asphalt: generateMaterialMaps('asphalt'),
            glass: new THREE.MeshPhysicalMaterial({
                color: 0x112233, metalness: 0.9, roughness: 0.1, 
                transmission: 0.9, transparent: true, opacity: 1.0, clearcoat: 1.0
            }),
            steel: new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.4 }),
            safetyOrange: new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.6 }),
            blueprint: new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.3 }),
            blueprintSolid: new THREE.MeshBasicMaterial({ color: 0x0a192f })
        };

        // ==================================================
        // 4. ARCHITECTURAL GENERATION (The 7-Floor Long Building)
        // ==================================================
        const BLDG = {
            gridX: 10,   // Number of spans X
            gridZ: 3,    // Number of spans Z
            spanX: 6.0,  // Meters
            spanZ: 7.0,  // Meters
            floors: 7,
            floorHeight: 3.6,
            colSize: 0.6,
            beamW: 0.4,
            beamD: 0.6,
            slabD: 0.25,
            coreWidth: 12.0, // Central core
            coreDepth: 7.0
        };

        const totalCols = (BLDG.gridX + 1) * (BLDG.gridZ + 1) * BLDG.floors;
        const beamsX = BLDG.gridX * (BLDG.gridZ + 1);
        const beamsZ = (BLDG.gridX + 1) * BLDG.gridZ;
        const totalBeams = (beamsX + beamsZ) * BLDG.floors;
        const totalSlabs = BLDG.gridX * BLDG.gridZ * BLDG.floors;
        const totalFootings = (BLDG.gridX + 1) * (BLDG.gridZ + 1);

        const boxGeo = new THREE.BoxGeometry(1, 1, 1);
        
        // Instanced Meshes for massive performance
        const instances = {
            footings: new THREE.InstancedMesh(boxGeo, mats.concrete, totalFootings),
            colRebar: new THREE.InstancedMesh(boxGeo, mats.rebar, totalCols),
            colForm: new THREE.InstancedMesh(boxGeo, mats.formwork, totalCols),
            colConc: new THREE.InstancedMesh(boxGeo, mats.concrete, totalCols),
            beamRebar: new THREE.InstancedMesh(boxGeo, mats.rebar, totalBeams),
            beamForm: new THREE.InstancedMesh(boxGeo, mats.formwork, totalBeams),
            beamConc: new THREE.InstancedMesh(boxGeo, mats.concrete, totalBeams),
            slabForm: new THREE.InstancedMesh(boxGeo, mats.formwork, totalSlabs),
            slabRebar: new THREE.InstancedMesh(boxGeo, mats.rebar, totalSlabs),
            slabConc: new THREE.InstancedMesh(boxGeo, mats.concrete, totalSlabs)
        };

        Object.values(instances).forEach(mesh => {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
        });

        // Calculate Structural Grid Data
        const structData = { cols: [], beams: [], slabs: [] };
        const originX = -(BLDG.gridX * BLDG.spanX) / 2;
        const originZ = -(BLDG.gridZ * BLDG.spanZ) / 2;

        let cIdx = 0, bIdx = 0, sIdx = 0, fIdx = 0;
        
        // Footings
        for (let x = 0; x <= BLDG.gridX; x++) {
            for (let z = 0; z <= BLDG.gridZ; z++) {
                const px = originX + x * BLDG.spanX;
                const pz = originZ + z * BLDG.spanZ;
                
                const dummy = new THREE.Object3D();
                dummy.position.set(px, -1.0, pz);
                dummy.scale.set(1.8, 1.0, 1.8);
                dummy.updateMatrix();
                instances.footings.setMatrixAt(fIdx++, dummy.matrix);
            }
        }

        // Superstructure
        for (let f = 0; f < BLDG.floors; f++) {
            const yBase = f * BLDG.floorHeight;
            
            // Columns
            for (let x = 0; x <= BLDG.gridX; x++) {
                for (let z = 0; z <= BLDG.gridZ; z++) {
                    const px = originX + x * BLDG.spanX;
                    const pz = originZ + z * BLDG.spanZ;
                    // Create construction staggering (left to right, front to back)
                    const stagger = (x / BLDG.gridX) * 0.4 + (z / BLDG.gridZ) * 0.2; 
                    structData.cols.push({ id: cIdx++, floor: f, px, py: yBase, pz, stagger });
                }
            }

            // Beams (X direction)
            for (let z = 0; z <= BLDG.gridZ; z++) {
                for (let x = 0; x < BLDG.gridX; x++) {
                    const px = originX + x * BLDG.spanX + BLDG.spanX / 2;
                    const pz = originZ + z * BLDG.spanZ;
                    const stagger = (x / BLDG.gridX) * 0.4 + (z / BLDG.gridZ) * 0.2;
                    structData.beams.push({ id: bIdx++, floor: f, px, py: yBase + BLDG.floorHeight, pz, len: BLDG.spanX, isX: true, stagger });
                }
            }
            // Beams (Z direction)
            for (let x = 0; x <= BLDG.gridX; x++) {
                for (let z = 0; z < BLDG.gridZ; z++) {
                    const px = originX + x * BLDG.spanX;
                    const pz = originZ + z * BLDG.spanZ + BLDG.spanZ / 2;
                    const stagger = (x / BLDG.gridX) * 0.4 + (z / BLDG.gridZ) * 0.2;
                    structData.beams.push({ id: bIdx++, floor: f, px, py: yBase + BLDG.floorHeight, pz, len: BLDG.spanZ, isX: false, stagger });
                }
            }

            // Slabs
            for (let x = 0; x < BLDG.gridX; x++) {
                for (let z = 0; z < BLDG.gridZ; z++) {
                    const px = originX + x * BLDG.spanX + BLDG.spanX / 2;
                    const pz = originZ + z * BLDG.spanZ + BLDG.spanZ / 2;
                    const stagger = (x / BLDG.gridX) * 0.4 + (z / BLDG.gridZ) * 0.2;
                    // Exclude core area for slabs (Staircase/Elevator shaft)
                    const isCore = (x >= 4 && x <= 5 && z === 1);
                    if(!isCore) {
                        structData.slabs.push({ id: sIdx++, floor: f, px, py: yBase + BLDG.floorHeight, pz, stagger });
                    }
                }
            }
        }

        // --- Core & Facade ---
        const archGroup = new THREE.Group();
        scene.add(archGroup);
        
        // Shear Wall Core
        const coreGeo = new THREE.BoxGeometry(BLDG.spanX * 2, BLDG.floors * BLDG.floorHeight, BLDG.spanZ);
        const core = new THREE.Mesh(coreGeo, mats.concrete);
        core.position.set(originX + 5 * BLDG.spanX, (BLDG.floors * BLDG.floorHeight)/2, originZ + 1.5 * BLDG.spanZ);
        core.castShadow = true; core.receiveShadow = true;
        archGroup.add(core);

        // Curtain Wall Facade (Revealed at the end)
        const facadeGroup = new THREE.Group();
        archGroup.add(facadeGroup);
        
        const bldgLength = BLDG.gridX * BLDG.spanX;
        const bldgDepth = BLDG.gridZ * BLDG.spanZ;
        const bldgHeight = BLDG.floors * BLDG.floorHeight;

        // Front & Back Glass
        [1, -1].forEach(dir => {
            const glass = new THREE.Mesh(new THREE.PlaneGeometry(bldgLength + 0.5, bldgHeight), mats.glass);
            glass.position.set(0, bldgHeight/2, dir * (bldgDepth/2 + 0.4));
            if(dir === -1) glass.rotation.y = Math.PI;
            glass.userData.isGlass = true;
            facadeGroup.add(glass);
            
            // Mullions
            for(let i=0; i<=BLDG.gridX*2; i++) {
                const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.1, bldgHeight, 0.2), mats.steel);
                mullion.position.set(originX + i * (BLDG.spanX/2), bldgHeight/2, dir * (bldgDepth/2 + 0.4));
                facadeGroup.add(mullion);
            }
        });

        facadeGroup.visible = false; // Hidden until end

        // ==================================================
        // 5. SITE ENVIRONMENT & TOWER CRANE
        // ==================================================
        const envGroup = new THREE.Group();
        scene.add(envGroup);

        // Ground
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), mats.soil);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2; // Excavation depth
        ground.receiveShadow = true;
        envGroup.add(ground);

        // Road
        const road = new THREE.Mesh(new THREE.PlaneGeometry(300, 20), mats.asphalt);
        road.rotation.x = -Math.PI / 2;
        road.position.set(0, 0, 35);
        road.receiveShadow = true;
        envGroup.add(road);

        // Tower Crane
        const crane = new THREE.Group();
        crane.position.set(originX - 10, -2, originZ - 5);
        scene.add(crane);

        const mastHeight = bldgHeight + 15;
        const mast = new THREE.Mesh(new THREE.BoxGeometry(2, mastHeight, 2), mats.safetyOrange);
        mast.position.y = mastHeight / 2;
        mast.castShadow = true;
        crane.add(mast);

        const slewingUnit = new THREE.Group();
        slewingUnit.position.y = mastHeight;
        crane.add(slewingUnit);

        const jibLen = 70;
        const jib = new THREE.Mesh(new THREE.BoxGeometry(jibLen, 1.5, 1.5), mats.safetyOrange);
        jib.position.set(jibLen/2 - 5, 2, 0);
        jib.castShadow = true;
        slewingUnit.add(jib);

        const counterJib = new THREE.Mesh(new THREE.BoxGeometry(15, 1.5, 1.5), mats.safetyOrange);
        counterJib.position.set(-12.5, 2, 0);
        slewingUnit.add(counterJib);
        
        const counterWeight = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 3), mats.concrete);
        counterWeight.position.set(-18, 3, 0);
        slewingUnit.add(counterWeight);

        const trolley = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 2), mats.steel);
        trolley.position.set(20, 1, 0);
        slewingUnit.add(trolley);

        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1), mats.steel);
        trolley.add(cable);
        
        const hook = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mats.safetyOrange);
        trolley.add(hook);
        
        const payload = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 2), mats.formwork);
        hook.add(payload);

        // ==================================================
        // 6. SCROLL TIMELINE & WORKFLOW LOGIC
        // ==================================================
        window.addEventListener('scroll', () => {
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            STATE.scrollProgress = maxScroll > 0 ? Math.max(0, Math.min(1, window.scrollY / maxScroll)) : 0;
        }, { passive: true });

        const tmpObj = new THREE.Object3D();
        
        // Helper: Map global progress to a local range 0-1
        function localP(global, start, end) {
            return Math.max(0, Math.min(1, (global - start) / (end - start)));
        }

        // Helper: Update InstancedMesh matrix
        function updateInstance(mesh, x, y, z, sx, sy, sz, idx, visible) {
            if (!visible || sy <= 0.01 || sx <= 0.01) {
                tmpObj.scale.set(0, 0, 0);
            } else {
                tmpObj.position.set(x, y + sy / 2, z);
                tmpObj.scale.set(sx, sy, sz);
            }
            tmpObj.updateMatrix();
            mesh.setMatrixAt(idx, tmpObj.matrix);
        }

        function updateWorkflow(p) {
            // HUD Updates
            const hudProgress = document.getElementById('hud-progress-percent');
            if(hudProgress) hudProgress.textContent = Math.floor(p * 100) + '%';
            
            let phase = "SITE PREPARATION";
            let lvl = "GROUND";
            
            if (p > 0.05) phase = "EXCAVATION";
            if (p > 0.10) { phase = "FOUNDATION"; lvl = "SUB-GRADE"; }
            
            // Phase mapping (Floors take up 0.17 to 0.88 approx)
            const floorDuration = (0.88 - 0.17) / BLDG.floors;
            if (p >= 0.17 && p < 0.88) {
                const currentF = Math.floor((p - 0.17) / floorDuration);
                phase = `STRUCTURAL FRAME`;
                lvl = currentF === 0 ? "GROUND" : `L0${currentF}`;
            }
            if (p >= 0.88) { phase = "ROOF & PARAPET"; lvl = "ROOF"; }
            if (p >= 0.94) { phase = "FACADE INSTALLATION"; lvl = "EXTERIOR"; }
            if (p >= 0.98) { phase = "PROJECT COMPLETE"; lvl = "HANDOVER"; }

            const hudPhase = document.getElementById('hud-current-phase');
            const hudLvl = document.getElementById('hud-current-level');
            if(hudPhase) hudPhase.textContent = phase;
            if(hudLvl) hudLvl.textContent = lvl;

            // 1. Excavation
            ground.position.y = -2 * (1 - localP(p, 0.02, 0.08));

            // 2. Foundations
            const foundP = localP(p, 0.10, 0.16);
            for(let i=0; i<totalFootings; i++) {
                updateInstance(instances.footings, 
                    originX + (i % (BLDG.gridX+1)) * BLDG.spanX, 
                    -1, 
                    originZ + Math.floor(i / (BLDG.gridX+1)) * BLDG.spanZ, 
                    1.8, 1.0 * foundP, 1.8, i, foundP > 0);
            }

            // 3. Structural Sequence
            const fStartBase = 0.17;
            
            // Core
            const coreP = localP(p, 0.17, 0.85);
            core.scale.set(1, coreP, 1);
            core.position.y = (bldgHeight * coreP) / 2;
            core.visible = coreP > 0;

            // Columns
            for (let i = 0; i < structData.cols.length; i++) {
                const col = structData.cols[i];
                const fStart = fStartBase + (col.floor * floorDuration) + (col.stagger * floorDuration * 0.3);
                
                const rebarP = localP(p, fStart, fStart + 0.02);
                const formInP = localP(p, fStart + 0.01, fStart + 0.03);
                const concP = localP(p, fStart + 0.02, fStart + 0.04);
                const formOutP = localP(p, fStart + 0.04, fStart + 0.05);

                const formActive = formInP > 0 && formOutP < 1.0;

                updateInstance(instances.colRebar, col.px, col.py, col.pz, BLDG.colSize*0.6, BLDG.floorHeight * rebarP, BLDG.colSize*0.6, col.id, rebarP > 0);
                updateInstance(instances.colForm, col.px, col.py, col.pz, BLDG.colSize*1.1, BLDG.floorHeight * formInP, BLDG.colSize*1.1, col.id, formActive);
                updateInstance(instances.colConc, col.px, col.py, col.pz, BLDG.colSize, BLDG.floorHeight * concP, BLDG.colSize, col.id, concP > 0);
            }

            // Beams
            for (let i = 0; i < structData.beams.length; i++) {
                const bm = structData.beams[i];
                const fStart = fStartBase + (bm.floor * floorDuration) + (bm.stagger * floorDuration * 0.3) + 0.03;
                
                const rebarP = localP(p, fStart, fStart + 0.02);
                const formInP = localP(p, fStart + 0.01, fStart + 0.03);
                const concP = localP(p, fStart + 0.02, fStart + 0.04);
                const formOutP = localP(p, fStart + 0.05, fStart + 0.06);

                const formActive = formInP > 0 && formOutP < 1.0;
                
                const sx = bm.isX ? bm.len * rebarP : BLDG.beamW * 0.8;
                const sz = bm.isX ? BLDG.beamW * 0.8 : bm.len * rebarP;
                
                tmpObj.position.set(bm.px, bm.py - BLDG.beamD/2, bm.pz);
                tmpObj.scale.set(sx, BLDG.beamD * 0.8, sz);
                tmpObj.updateMatrix(); instances.beamRebar.setMatrixAt(bm.id, rebarP>0 ? tmpObj.matrix : new THREE.Matrix4().makeScale(0,0,0));
                
                const fsx = bm.isX ? bm.len * formInP : BLDG.beamW * 1.2;
                const fsz = bm.isX ? BLDG.beamW * 1.2 : bm.len * formInP;
                tmpObj.scale.set(fsx, BLDG.beamD * 1.1, fsz);
                tmpObj.updateMatrix(); instances.beamForm.setMatrixAt(bm.id, formActive ? tmpObj.matrix : new THREE.Matrix4().makeScale(0,0,0));
                
                const csx = bm.isX ? bm.len * concP : BLDG.beamW;
                const csz = bm.isX ? BLDG.beamW : bm.len * concP;
                tmpObj.scale.set(csx, BLDG.beamD, csz);
                tmpObj.updateMatrix(); instances.beamConc.setMatrixAt(bm.id, concP>0 ? tmpObj.matrix : new THREE.Matrix4().makeScale(0,0,0));
            }

            // Slabs
            for (let i = 0; i < structData.slabs.length; i++) {
                const sl = structData.slabs[i];
                const fStart = fStartBase + (sl.floor * floorDuration) + (sl.stagger * floorDuration * 0.3) + 0.04;
                
                const formInP = localP(p, fStart, fStart + 0.02);
                const concP = localP(p, fStart + 0.02, fStart + 0.05);
                const formOutP = localP(p, fStart + 0.06, fStart + 0.07);

                const formActive = formInP > 0 && formOutP < 1.0;

                tmpObj.position.set(sl.px, sl.py - BLDG.slabD/2, sl.pz);
                tmpObj.scale.set(BLDG.spanX * formInP, 0.05, BLDG.spanZ * formInP);
                tmpObj.updateMatrix(); instances.slabForm.setMatrixAt(sl.id, formActive ? tmpObj.matrix : new THREE.Matrix4().makeScale(0,0,0));

                tmpObj.position.set(sl.px, sl.py, sl.pz);
                tmpObj.scale.set(BLDG.spanX * concP, BLDG.slabD, BLDG.spanZ * concP);
                tmpObj.updateMatrix(); instances.slabConc.setMatrixAt(sl.id, concP>0 ? tmpObj.matrix : new THREE.Matrix4().makeScale(0,0,0));
            }

            Object.values(instances).forEach(m => m.instanceMatrix.needsUpdate = true);

            // 4. Facade & Architectural Reveal
            const facP = localP(p, 0.94, 0.98);
            facadeGroup.visible = facP > 0;
            if (facP > 0) {
                facadeGroup.position.y = (1 - facP) * 20;
                facadeGroup.children.forEach(c => {
                    if(c.userData.isGlass && c.material.transparent) {
                        c.material.opacity = facP;
                    }
                });
            }
        }

        // ==================================================
        // 7. CINEMATIC CAMERA SYSTEM
        // ==================================================
        function updateCamera(p) {
            const keyframes = [
                { p: 0.00, pos: [originX - 30, 20, originZ + 50], tar: [0, 5, 0] },
                { p: 0.10, pos: [0, 5, originZ + 30], tar: [0, 0, 0] },
                { p: 0.25, pos: [originX + 10, 8, originZ - 20], tar: [originX + 20, 5, 0] },
                { p: 0.50, pos: [originX + 30, 25, originZ + 35], tar: [0, 15, 0] },
                { p: 0.75, pos: [originX - 15, 35, originZ - 10], tar: [0, 25, 0] },
                { p: 0.94, pos: [originX - 25, 10, originZ + 45], tar: [0, 12, 0] },
                { p: 1.00, pos: [0, 15, originZ + 60], tar: [0, 12, 0] }
            ];

            let k1 = keyframes[0], k2 = keyframes[1];
            for (let i = 0; i < keyframes.length - 1; i++) {
                if (p >= keyframes[i].p && p <= keyframes[i+1].p) {
                    k1 = keyframes[i]; k2 = keyframes[i+1];
                    break;
                }
            }

            const t = (p - k1.p) / (k2.p - k1.p);
            const ease = t * t * (3 - 2 * t);

            camera.position.set(
                k1.pos[0] + (k2.pos[0] - k1.pos[0]) * ease,
                k1.pos[1] + (k2.pos[1] - k1.pos[1]) * ease,
                k1.pos[2] + (k2.pos[2] - k1.pos[2]) * ease
            );

            const tx = k1.tar[0] + (k2.tar[0] - k1.tar[0]) * ease;
            const ty = k1.tar[1] + (k2.tar[1] - k1.tar[1]) * ease;
            const tz = k1.tar[2] + (k2.tar[2] - k1.tar[2]) * ease;
            camera.lookAt(tx, ty, tz);

            const cx = document.getElementById('coord-x');
            const cy = document.getElementById('coord-y');
            const cz = document.getElementById('coord-z');
            if(cx) cx.textContent = `X: ${camera.position.x.toFixed(1)}`;
            if(cy) cy.textContent = `Y: ${camera.position.y.toFixed(1)}`;
            if(cz) cz.textContent = `Z: ${camera.position.z.toFixed(1)}`;
        }

        // ==================================================
        // 8. AMBIENT ANIMATION (Independent of Scroll)
        // ==================================================
        function updateAmbient(time) {
            const slewingAngle = Math.sin(time * 0.2) * (Math.PI / 4) + (Math.PI / 8);
            slewingUnit.rotation.y = slewingAngle;

            const trolleyPos = 15 + Math.sin(time * 0.5) * 10;
            trolley.position.x = trolleyPos;

            const hoistLen = 10 + Math.cos(time * 0.3) * 5;
            cable.position.y = -hoistLen / 2;
            cable.scale.y = hoistLen;
            hook.position.y = -hoistLen;

            payload.visible = Math.cos(time * 0.3) > 0;
            
            if(!PREFERS_REDUCED_MOTION) {
                camera.position.x += Math.sin(time * 0.5) * 0.1;
                camera.position.y += Math.cos(time * 0.4) * 0.05;
            }
        }

        // ==================================================
        // 9. UI & BLUEPRINT TOGGLE
        // ==================================================
        const bpToggle = document.getElementById('toggle-blueprint');
        const constToggle = document.getElementById('toggle-construction');
        
        if (bpToggle && constToggle) {
            bpToggle.addEventListener('click', () => {
                STATE.mode = 'blueprint';
                bpToggle.classList.add('is-active');
                constToggle.classList.remove('is-active');
                document.body.classList.add('blueprint-mode');
                
                // Swap to technical look
                scene.background = new THREE.Color(0x0a192f);
                scene.fog.color.setHex(0x0a192f);
                
                Object.values(instances).forEach(inst => {
                    inst.material = mats.blueprint;
                });
                core.material = mats.blueprint;
                ground.material = mats.blueprintSolid;
                road.material = mats.blueprintSolid;
                
                facadeGroup.children.forEach(c => c.material = mats.blueprint);
            });

            constToggle.addEventListener('click', () => {
                STATE.mode = 'construction';
                constToggle.classList.add('is-active');
                bpToggle.classList.remove('is-active');
                document.body.classList.remove('blueprint-mode');
                
                // Swap back to photoreal
                scene.background = new THREE.Color(0xb0c4de);
                scene.fog.color.setHex(0xb0c4de);
                
                instances.footings.material = mats.concrete;
                instances.colRebar.material = mats.rebar;
                instances.colForm.material = mats.formwork;
                instances.colConc.material = mats.concrete;
                instances.beamRebar.material = mats.rebar;
                instances.beamForm.material = mats.formwork;
                instances.beamConc.material = mats.concrete;
                instances.slabForm.material = mats.formwork;
                instances.slabRebar.material = mats.rebar;
                instances.slabConc.material = mats.concrete;
                
                core.material = mats.concrete;
                ground.material = mats.soil;
                road.material = mats.asphalt;
                
                facadeGroup.children.forEach(c => {
                    c.material = c.userData.isGlass ? mats.glass : mats.steel;
                });
            });
        }

        // ==================================================
        // 10. RENDER LOOP
        // ==================================================
        const clock = new THREE.Clock();

        function render() {
            requestAnimationFrame(render);
            
            const dt = clock.getDelta();
            STATE.time += dt;

            STATE.smoothedProgress += (STATE.scrollProgress - STATE.smoothedProgress) * 0.08;

            updateWorkflow(STATE.smoothedProgress);
            updateCamera(STATE.smoothedProgress);
            updateAmbient(STATE.time);

            renderer.render(scene, camera);
        }

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        setTimeout(() => {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.style.display = 'none', 800);
            }
        }, 1500);

        render();
    }

    boot();

})();