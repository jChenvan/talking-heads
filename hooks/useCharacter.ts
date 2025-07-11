"use client";

import throttle from "@/utils/throttle";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default () => {
    const [gltf, setGltf] = useState<GLTF>();
    const [canvas, setCanvas] = useState<HTMLCanvasElement>();
    const setMorphTargets = useRef<any>(null);
    const setBend = useRef<any>(null);
    const setTwist = useRef<any>(null);

    const sceneData = useMemo(()=>{
        if (!gltf) return null;

        //Get Scene Data
        const camera = gltf.cameras[0];
        const lights:THREE.DirectionalLight[] = gltf.scene.getObjectsByProperty("type", "DirectionalLight") as THREE.DirectionalLight[];
        const meshes:THREE.SkinnedMesh[] = gltf.scene.getObjectsByProperty("type", "SkinnedMesh") as THREE.SkinnedMesh[];
        const bones:THREE.Bone[] = gltf.scene.getObjectsByProperty("type", "Bone") as THREE.Bone[];

        //Adjust Lights
        lights.forEach(l=>{
            l.intensity = 0.03*l.intensity;
        })

        return gltf &&{
            camera, 
            lights,
            meshes,
            bones,
        }
    },[gltf]);

    useEffect(()=>{
        const url = "/character.glb";
        const gltfLoader = new GLTFLoader();

        gltfLoader.load(url,data=>{
            setGltf(data);
        });
    }, []);

    useEffect(()=>{
        if (!sceneData || !gltf) return;

        //Setup Canvas
        const scene = new THREE.Scene();

        scene.add(gltf.scene);

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        renderer.setSize(500,500);
        renderer.setClearColor(0x000000,0);

        const {domElement} = renderer;
        setCanvas(domElement);

        //Setup Mouse Tracking

        const geo = new THREE.PlaneGeometry(10,10,1,1);
        const mat = new THREE.MeshBasicMaterial({color:0x00FF00, transparent:true, opacity: 0});
        const intersectPlane = new THREE.Mesh(geo, mat);
        scene.add(intersectPlane);

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onPointerMove = throttle((e:MouseEvent)=>{
            mouse.x = (e.offsetX / 500) * 2 - 1;
            mouse.y = -(e.offsetY / 500) * 2 + 1;
        }, 16);

        domElement.addEventListener("pointerenter", ()=>domElement.addEventListener("pointermove",onPointerMove));
        domElement.addEventListener("pointerleave", ()=>domElement.removeEventListener("pointermove",onPointerMove));

        //Control Function For Blendshapes
        setMorphTargets.current = ({
            HappyOpen,
            UpsetOpen,
            LeftLid,
            RightLid,
        }:{
            HappyOpen?: number,
            UpsetOpen?: number,
            LeftLid?: number,
            RightLid?: number,
        })=>{
            sceneData.meshes.forEach(m=>{
                if (HappyOpen || HappyOpen === 0) m.morphTargetInfluences![m.morphTargetDictionary!["HappyOpen"]] = HappyOpen;
                if (UpsetOpen || UpsetOpen === 0) m.morphTargetInfluences![m.morphTargetDictionary!["UpsetOpen"]] = UpsetOpen;
                if (LeftLid || LeftLid === 0) m.morphTargetInfluences![m.morphTargetDictionary!["LeftLid"]] = LeftLid;
                if (RightLid || RightLid === 0) m.morphTargetInfluences![m.morphTargetDictionary!["RightLid"]] = RightLid;
            })
        }

        setMorphTargets.current({
            HappyOpen:0,
            LeftLid:0,
            RightLid:0,
            UpsetOpen:0,
        });

        //Control Function Rig

        setBend.current = (angle:number) => {
            sceneData?.bones.slice(1).forEach(bone=>bone.rotation.x = angle);
        }

        setTwist.current = (angle:number) => {
            sceneData?.bones.slice(1).forEach(bone=>bone.rotation.y = angle);
        }

        //Setup Animation Loop
        function animate() {
            requestAnimationFrame(animate);
            if (!sceneData) return;

            renderer.render(scene, sceneData.camera);
        }

        animate();
    },[sceneData]);

    return {canvas,
        setMorphTargets: ({
            HappyOpen,
            UpsetOpen,
            LeftLid,
            RightLid,
        }:{
            HappyOpen?: number,
            UpsetOpen?: number,
            LeftLid?: number,
            RightLid?: number,
        })=>setMorphTargets.current({
            HappyOpen,
            UpsetOpen,
            LeftLid,
            RightLid,
        }),
        setBend: (angle: number)=>setBend.current(angle),
        setTwist: (angle: number)=>setTwist.current(angle),
    }
}