import throttle from "@/utils/throttle";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

export default function useHead() {
    const [canvas, setCanvas] = useState<HTMLCanvasElement|null>(null);
    const setBlendShape = useRef<(val:number)=>void>(null);
    const [mousePos, setMousePos] = useState<THREE.Vector3|null>(null);

    useEffect(()=>{
        const scene = new THREE.Scene();

        const renderer = new THREE.WebGLRenderer({alpha:true});
        renderer.setSize(500,500);
        renderer.setClearColor(0x000000,0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 3;

        setCanvas(renderer.domElement);

        const geo = new THREE.PlaneGeometry(10,10,1,1);
        const mat = new THREE.MeshBasicMaterial({color:0xFF0000, transparent:true, opacity: 0});
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
            const mesh = rig?.children[0] as THREE.Mesh;
            const camera = children.find(x=>(x.name === "Camera")) as THREE.Camera;

            if (!mesh || !camera) return;

            renderer.domElement.addEventListener("mousemove", throttle((e:MouseEvent)=>{
                mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
                mouse.y = (e.clientY / window.innerHeight) * 2 - 1;

                raycaster.setFromCamera(mouse, camera);

                const intersects = raycaster.intersectObject(intersectPlane);
                console.log(intersects[0].point);

                if (intersects.length > 0) setMousePos(intersects[0].point);
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

    return {canvas, setBlendShape, mousePos};
}