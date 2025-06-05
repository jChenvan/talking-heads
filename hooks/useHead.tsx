import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

export default function useHead() {
    const [canvas, setCanvas] = useState<HTMLCanvasElement|null>(null);

    useEffect(()=>{
        const scene = new THREE.Scene();
        const renderer = new THREE.WebGLRenderer({alpha:true});
        renderer.setSize(500,500);
        renderer.setClearColor(0x000000,0);
        setCanvas(renderer.domElement);

        const gltfLoader = new GLTFLoader();

        const url = '/homersHead.glb';
        gltfLoader.load(url,data=>{
            const {children} = data.scene;

            const head = children.find(x=>(x.type != "PerspectiveCamera"));
            const camera = children.find(x=>(x.type === "PerspectiveCamera"));

            if (!head || !camera) return;

            scene.add(head);

            function animate() {
                renderer.render( scene, camera as THREE.Camera);
            }

            renderer.setAnimationLoop( animate );
        });
    },[]);

    return {canvas};
}