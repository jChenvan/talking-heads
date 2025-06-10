import throttle from "@/utils/throttle";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/Addons.js";

export default function useHead() {
    const [camera, setCamera] = useState<THREE.Camera|null>(null);
    const [meshes, setMeshes] = useState<THREE.SkinnedMesh[]>([]);
    const [headBone, setHeadBone] = useState<THREE.Bone|null>(null);
    const [eyeBones, setEyeBones] = useState<THREE.Bone[]>([]);

    const [canvas, setCanvas] = useState<HTMLCanvasElement|null>(null);
    const mousePos = useRef<THREE.Vector3>(null);
    const isTracking = useRef(true);
    const eyeTarg = useRef<THREE.Vector3>(null);
    const headTarg = useRef<THREE.Vector3>(null);
    const [isHappy, setIsHappy] = useState<boolean>(true);

    const setMouthOpen = useCallback((val:number)=>{
        const shape = isHappy ? "happyOpen" : "angryOpen";
        meshes.forEach(mesh=>{
            if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
                if (mesh.morphTargetDictionary[shape] || mesh.morphTargetDictionary[shape] === 0) {
                    const index = mesh.morphTargetDictionary[shape];
                    mesh.morphTargetInfluences[index] = val;
                }
                if (mesh.morphTargetDictionary["Open"] || mesh.morphTargetDictionary["Open"] === 0) {
                    const index = mesh.morphTargetDictionary["Open"];
                    mesh.morphTargetInfluences[index] = val;
                }
            }
        })
    }, [isHappy, meshes]);

    useEffect(()=>{
        const url = "/testMan.glb"/* '/homersHeadRigged.glb' */;
        const gltfLoader = new GLTFLoader();

        gltfLoader.load(url,data=>{
            setCamera(data.cameras[0]);

            const meshes:THREE.SkinnedMesh[] = [];
            data.scene.traverse((child)=>{
                if (child.type === "SkinnedMesh") meshes.push(child as THREE.SkinnedMesh);
            });
            setMeshes(meshes);

            setHeadBone(data.scene.getObjectByName("head") as THREE.Bone);
            setEyeBones([
                data.scene.getObjectByName("Reye") as THREE.Bone,
                data.scene.getObjectByName("Leye") as THREE.Bone
            ]);
        });
    },[]);

    useEffect(()=>{
        if (!camera || meshes.length === 0 || !headBone || eyeBones.length === 0) return;
        const eyeTargetDistance = 0.5;
        const headTargetDistance = 1;
        const bobbingAmplitude = 0.005;

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

        const eyeOffsets:THREE.Vector3[] = [];

        headBone?.updateMatrixWorld();
        const headPos = new THREE.Vector3();
        headBone?.getWorldPosition(headPos);
        const defaultHeadTarget = new THREE.Vector3(headPos.x, headPos.y, headTargetDistance);

        const defaultEyeTarget = new THREE.Vector3();
        eyeBones.forEach(eye=>{
            if (!eye) return;
            eye.updateMatrixWorld();
            const eyePos = new THREE.Vector3();
            eye.getWorldPosition(eyePos);
            defaultEyeTarget.add(eyePos);
        });
        defaultEyeTarget.divideScalar(eyeBones.length);
        defaultEyeTarget.z = eyeTargetDistance;

        eyeBones.forEach(eye=>{
            if (!eye) return;
            const eyePos = new THREE.Vector3();
            const headPos = new THREE.Vector3();
            const eyeOffset = new THREE.Vector3();

            eye.updateMatrixWorld();
            headBone?.updateMatrixWorld();

            eye.getWorldPosition(eyePos);
            headBone?.getWorldPosition(headPos);

            eyeOffset.copy(eyePos).sub(headPos);
            eyeOffsets.push(eyeOffset);

            headBone?.remove(eye);
            eye.position.copy(eyePos);
        });

        function lockEyesToHead() {
            if (!headBone) return;
            headBone.updateMatrixWorld();

            const headPos = new THREE.Vector3();
            const headQuat = new THREE.Quaternion();

            headBone.getWorldPosition(headPos);
            headBone.getWorldQuaternion(headQuat);

            eyeBones.forEach((eye, index) => {
                if (!eye) return;
                const eyeOffset = eyeOffsets[index];
                const eyePos = eyeOffset.clone().applyQuaternion(headQuat).add(headPos);

                eye.position.copy(eyePos);
                eye.updateMatrixWorld();
            });
        }

        const headAt = (target:THREE.Vector3) => {
            if (!headBone) return;

            headBone.lookAt(target);

            lockEyesToHead();
        };
        const eyesAt = (target:THREE.Vector3) => eyeBones.forEach(eye=>{
            if (!eye) return;
            eye.lookAt(target);
            eye.quaternion.multiply(boneCorrection);
            eye.updateMatrixWorld();
        });
        const toDefaultState = (eyeStart:THREE.Vector3, headStart:THREE.Vector3) => {
            const startTime = performance.now();

            const animate = () => {
                const progress = (performance.now() - startTime) / 200;
                if (progress > 1) {
                    headAt(defaultHeadTarget);
                    eyesAt(defaultEyeTarget);
                    return;
                }

                requestAnimationFrame(animate);

                const eyeTarget = defaultEyeTarget.clone();
                eyeTarget.multiplyScalar(progress);
                eyeTarget.addScaledVector(eyeStart, 1 - progress);
                eyeTarget.z = eyeTargetDistance;

                const headTarget = defaultHeadTarget.clone();
                headTarget.multiplyScalar(progress);
                headTarget.addScaledVector(headStart, 1 - progress);
                headTarget.z = headTargetDistance;

                headAt(headTarget);
                eyesAt(eyeTarget);
            }

            animate();
        };

        const onMouseMove = throttle((e:MouseEvent)=>{
            mouse.x = (e.offsetX / 500) * 2 - 1;
            mouse.y = -(e.offsetY / 500) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);

            const intersects = raycaster.intersectObject(intersectPlane);

            if (intersects.length === 0) return; 

            const {point} = intersects[0];

            mousePos.current = point;
        }, 16);

        domElement.addEventListener("mousemove", onMouseMove);
        domElement.addEventListener("mouseenter", ()=>{
            domElement.addEventListener("mousemove", onMouseMove);
            isTracking.current = true;
        });
        domElement.addEventListener("mouseleave", ()=>{
            domElement.removeEventListener("mousemove", onMouseMove);
            isTracking.current = false;
            toDefaultState(eyeTarg.current || new THREE.Vector3(0, 0, 2), headTarg.current || new THREE.Vector3(0, 0, 10));
        });

        scene.add(...meshes);

        const textureCube = new THREE.CubeTextureLoader().load([
            '/cube/px.png',
            '/cube/nx.png',
            '/cube/py.png',
            '/cube/ny.png',
            '/cube/pz.png',
            '/cube/nz.png',
        ]);

        scene.environment = textureCube;

        const speed = 0.1;
        const start = performance.now();

        function animate() {
            renderer.render( scene, camera as THREE.Camera);

            if (headBone) {
                headBone.position.y = Math.sin((performance.now() - start) * Math.PI / 3000) * bobbingAmplitude + headPos.y / 2;
                lockEyesToHead();
            }

            if (isTracking.current && mousePos.current && eyeTarg.current && headTarg.current) {
                const eyeTo = mousePos.current.clone();
                eyeTo.z = eyeTargetDistance;

                const headTo = mousePos.current.clone();
                headTo.z = headTargetDistance;

                const eyeDir = eyeTo.clone().sub(eyeTarg.current) || new THREE.Vector3();
                const headDir = headTo.clone().sub(headTarg.current) || new THREE.Vector3();

                const eyeDirLen = eyeDir.length();
                const headDirLen = headDir.length();

                const eyeDirNorm = eyeDirLen > 0 ? eyeDir.normalize() : new THREE.Vector3();
                const headDirNorm = headDirLen > 0 ? headDir.normalize() : new THREE.Vector3();

                eyeTarg.current.addScaledVector(eyeDirNorm, Math.min(speed, eyeDirLen));
                headTarg.current.addScaledVector(headDirNorm, Math.min(speed, headDirLen));
            } else {
                eyeTarg.current = defaultEyeTarget.clone();
                headTarg.current = defaultHeadTarget.clone();
            }

            eyesAt(eyeTarg.current);
            headAt(headTarg.current);
        }

        renderer.setAnimationLoop( animate );
    },[camera, meshes, headBone, eyeBones]);

    return {canvas, setMouthOpen, setIsHappy};
}