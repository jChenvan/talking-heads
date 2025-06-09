import throttle from "@/utils/throttle";
import { use, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

export default function useHead() {
    const [canvas, setCanvas] = useState<HTMLCanvasElement|null>(null);
    const setBlendShape = useRef<(val:number)=>void>(null);
    const [mousePos, setMousePos] = useState<THREE.Vector3|null>(null);
    const eyesAt = useRef<(target:THREE.Vector3)=>void>(null);
    const headAt = useRef<(target:THREE.Vector3)=>void>(null);
    const defaultEyeTarget = useRef<THREE.Vector3>(null);

    useEffect(()=>{
        const scene = new THREE.Scene();

        const renderer = new THREE.WebGLRenderer({alpha:true});
        renderer.setSize(500,500);
        renderer.setClearColor(0x000000,0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 3;

        const {domElement} = renderer;
        setCanvas(domElement);

        const boneCorrection = new THREE.Quaternion();
        boneCorrection.setFromEuler(new THREE.Euler(Math.PI/2,0,0));

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

            const rig = children.find(x=>(x.name === "Armature"));
            const mesh = rig?.children[0] as THREE.SkinnedMesh;
            const bones = mesh.skeleton.bones;
            const head = bones.find(bone=>bone.name.includes("head"));
            const eyes = bones.filter(bone=>bone.name.includes("eye"));
            const eyeOffsets:THREE.Vector3[] = [];

            const defaultEyeTargetCurrent = new THREE.Vector3();
            eyes.forEach(eye=>{
                eye.updateMatrixWorld();
                const eyePos = new THREE.Vector3();
                eye.getWorldPosition(eyePos);
                defaultEyeTargetCurrent.add(eyePos);
            });
            defaultEyeTargetCurrent.divideScalar(eyes.length);
            defaultEyeTargetCurrent.z += 2;

            defaultEyeTarget.current = defaultEyeTargetCurrent;

            eyes.forEach(eye=>{
                const eyePos = new THREE.Vector3();
                const headPos = new THREE.Vector3();
                const eyeOffset = new THREE.Vector3();

                eye.updateMatrixWorld();
                head?.updateMatrixWorld();

                eye.getWorldPosition(eyePos);
                head?.getWorldPosition(headPos);

                eyeOffset.copy(eyePos).sub(headPos);
                eyeOffsets.push(eyeOffset);

                head?.remove(eye);
                eye.position.copy(eyePos);
            });

            headAt.current = target => {
                if (!head) return;

                head.lookAt(target);

                head.updateMatrixWorld();

                const headPos = new THREE.Vector3();
                const headQuat = new THREE.Quaternion();

                head.getWorldPosition(headPos);
                head.getWorldQuaternion(headQuat);

                eyes.forEach((eye, index) => {
                    const eyeOffset = eyeOffsets[index];
                    const eyePos = eyeOffset.clone().applyQuaternion(headQuat).add(headPos);

                    eye.position.copy(eyePos);
                    eye.updateMatrixWorld();
                });
            };
            eyesAt.current = target => eyes.forEach(eye=>{
                eye.lookAt(target);
                eye.quaternion.multiply(boneCorrection);
                eye.updateMatrixWorld();
            });
            
            const camera = children.find(x=>(x.name === "Camera")) as THREE.Camera;

            if (!mesh || !camera) return;

            const onMouseMove = throttle((e:MouseEvent)=>{
                mouse.x = (e.offsetX / 500) * 2 - 1;
                mouse.y = -(e.offsetY / 500) * 2 + 1;

                raycaster.setFromCamera(mouse, camera);

                const intersects = raycaster.intersectObject(intersectPlane);

                if (intersects.length === 0) return; 

                const {point} = intersects[0];

                setMousePos(point);
            }, 100);

            domElement.addEventListener("mousemove", onMouseMove);
            domElement.addEventListener("mouseenter", ()=>domElement.addEventListener("mousemove", onMouseMove));
            domElement.addEventListener("mouseleave", ()=>{
                domElement.removeEventListener("mousemove", onMouseMove);
                setMousePos(null);
            });

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

    return {canvas, setBlendShape, mousePos, eyesAt, headAt, defaultEyeTarget};
}