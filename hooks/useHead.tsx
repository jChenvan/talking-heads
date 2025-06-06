import throttle from "@/utils/throttle";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

export default function useHead() {
    const [canvas, setCanvas] = useState<HTMLCanvasElement|null>(null);
    const setBlendShape = useRef<(val:number)=>void>(null);
    const [mousePos, setMousePos] = useState<THREE.Vector3|null>(null);
    const eyesAt = useRef<(target:THREE.Vector3)=>void>(null);
    const headAt = useRef<(target:THREE.Vector3)=>void>(null);

    useEffect(()=>{
        const scene = new THREE.Scene();

        const renderer = new THREE.WebGLRenderer({alpha:true});
        renderer.setSize(500,500);
        renderer.setClearColor(0x000000,0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 3;

        setCanvas(renderer.domElement);

        const boneCorrection = new THREE.Quaternion();
        boneCorrection.setFromEuler(new THREE.Euler(Math.PI/2,0,0));

        /* const testGeo = new THREE.BoxGeometry(0.2,0.2);
        const testMat = new THREE.MeshBasicMaterial({color:0xFF0000});
        const testCube = new THREE.Mesh(testGeo,testMat);
        scene.add(testCube); */

        const geo = new THREE.PlaneGeometry(10,10,1,1);
        const mat = new THREE.MeshBasicMaterial({color:0x00FF00, transparent:true, opacity: 0});
        const intersectPlane = new THREE.Mesh(geo, mat);
        scene.add(intersectPlane);

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const gltfLoader = new GLTFLoader();

        const url = '/homersHeadRigged.glb';
        gltfLoader.load(url,data=>{
            const {children} = data.scene;
            /* console.dir(children, {depth:null}); */

            const rig = children.find(x=>(x.name === "Armature"));
            const mesh = rig?.children[0] as THREE.SkinnedMesh;
            const bones = mesh.skeleton.bones;
            const head = bones.find(bone=>bone.name.includes("head"));
            const eyes = bones.filter(bone=>bone.name.includes("eye"));
            const isolaters:THREE.Object3D<THREE.Object3DEventMap>[] = [];

            eyes.forEach(eye=>{
                const isolate = new THREE.Object3D();
                isolate.position.copy(eye.position);
                eye.position.set(0,0,0);

                const parent = eye.parent;

                parent?.remove(eye);
                parent?.add(isolate);
                isolate.add(eye);

                isolaters.push(isolate);
            });

            headAt.current = target => {
                if (!head) return;
                /* const localTarget = head.parent?.worldToLocal(target.clone());
                if (localTarget) head.lookAt(localTarget); */

                head.lookAt(target);

                isolaters.forEach(isolate=>{
                    const worldQuaternion = new THREE.Quaternion();
                    head.getWorldQuaternion(worldQuaternion);
                    isolate.quaternion.copy(worldQuaternion.invert());
                });
            };
            eyesAt.current = target => eyes.forEach(eye=>{
                const localTarget = eye.parent?.worldToLocal(target.clone());
                if (localTarget) eye.lookAt(localTarget);
                eye.quaternion.multiply(boneCorrection);
            });
            
            const camera = children.find(x=>(x.name === "Camera")) as THREE.Camera;

            if (!mesh || !camera) return;

            renderer.domElement.addEventListener("mousemove", throttle((e:MouseEvent)=>{
                mouse.x = (e.offsetX / 500) * 2 - 1;
                mouse.y = -(e.offsetY / 500) * 2 + 1;

                raycaster.setFromCamera(mouse, camera);

                const intersects = raycaster.intersectObject(intersectPlane);

                if (intersects.length === 0) return; 

                const {point} = intersects[0];

                /* testCube.position.set(point.x,point.y,point.z); */

                setMousePos(point);
            }, 100));

            setBlendShape.current = (val:number)=>{mesh.morphTargetInfluences![0] = val};

            scene.add(mesh);

            const textureCube = new THREE.CubeTextureLoader().load([
                '/cube/px.png',
                '/cube/nx.png',
                '/cube/py.png',
                '/cube/ny.png',
                '/cube/pz.png',
                '/cube/nz.png',
            ]);

            scene.environment = textureCube;

            function animate() {
                renderer.render( scene, camera as THREE.Camera);
            }

            renderer.setAnimationLoop( animate );
        });
    },[]);

    return {canvas, setBlendShape, mousePos, eyesAt, headAt};
}