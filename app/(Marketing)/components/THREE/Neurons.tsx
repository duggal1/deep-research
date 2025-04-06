// // components/NeuralNetworkAnimation.tsx
// import React, { useRef, useEffect, useState } from 'react';
// import * as THREE from 'three';

// interface NeuralNetworkAnimationProps {
//   theme?: string;
// }

// // Create a proper interface for the neuron with additional properties
// interface NeuronProps {
//   velocity: THREE.Vector3;
//   pulsePhase: number;
//   pulseSpeed: number;
//   originalColor: number;
// }

// const NeuralNetworkAnimation: React.FC<NeuralNetworkAnimationProps> = ({ theme }) => {
//   const mountRef = useRef<HTMLDivElement>(null);
//   const [hoveredQuestion, setHoveredQuestion] = useState<string | null>(null);
  
//   // Philosophical questions that appear on hover
//   const universalQuestions = [
//     "Understand the universes",
//     "Will machines expose human truths?",
//     "Are we alone in eternity's expanse?",
//     "Do multiple realities coexist?",
//     "What sparked the universal birth?",
//     "Is consciousness an emergent property?"
//   ];
  
//   useEffect(() => {
//     if (!mountRef.current) return;

//     // Scene setup
//     const scene = new THREE.Scene();
//     const camera = new THREE.PerspectiveCamera(
//       75, 
//       window.innerWidth / window.innerHeight, 
//       0.1, 
//       1000
//     );
    
//     const renderer = new THREE.WebGLRenderer({ 
//       antialias: true, 
//       alpha: true,
//       powerPreference: 'high-performance'
//     });
    
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     renderer.setClearColor(0x000000, 0);
//     renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
//     // Clear any previous canvas
//     while (mountRef.current.firstChild) {
//       mountRef.current.removeChild(mountRef.current.firstChild);
//     }
    
//     mountRef.current.appendChild(renderer.domElement);
    
//     // Determine colors based on theme
//     const isDarkMode = theme === 'dark';
    
//     // Refined color palette
//     const nodeColor = isDarkMode ? 0xffffff : 0x222222;
//     const nodeHoverColor = isDarkMode ? 0x88ccff : 0x4488cc;
//     const primaryConnectionColor = isDarkMode ? 0x4488ff : 0x2266aa;
//     const secondaryConnectionColor = isDarkMode ? 0x2244aa : 0x88aadd;
//     const bgColor = isDarkMode ? 0x080808 : 0xfafafa;
    
//     // Set background color
//     scene.background = new THREE.Color(bgColor);

//     // Map to store neuron properties
//     const neuronProperties = new Map<THREE.Object3D, NeuronProps>();
    
//     // Create neurons (nodes)
//     const neurons: THREE.Mesh[] = [];
//     const neuronCount = 120;
//     const neuronGeometry = new THREE.SphereGeometry(0.06, 12, 12);
    
//     // Create three distinct layers for more realistic neural network structure
//     for (let i = 0; i < neuronCount; i++) {
//       const neuronMaterial = new THREE.MeshBasicMaterial({ 
//         color: nodeColor,
//         transparent: true,
//         opacity: 0.9
//       });
      
//       const neuron = new THREE.Mesh(neuronGeometry, neuronMaterial);
      
//       // Distribute neurons in layers
//       const layerIndex = Math.floor(Math.random() * 3); // 0, 1, or 2
      
//       // Position based on layer
//       neuron.position.x = (Math.random() - 0.5) * 8;
//       neuron.position.y = (Math.random() - 0.5) * 8;
//       neuron.position.z = layerIndex * 3 - 3 + (Math.random() - 0.5);
      
//       // Store properties separately in the map
//       neuronProperties.set(neuron, {
//         velocity: new THREE.Vector3(
//           (Math.random() - 0.5) * 0.005,
//           (Math.random() - 0.5) * 0.005,
//           (Math.random() - 0.5) * 0.002 // Less z-movement
//         ),
//         pulsePhase: Math.random() * Math.PI * 2,
//         pulseSpeed: 0.03 + Math.random() * 0.04,
//         originalColor: nodeColor
//       });
      
//       neurons.push(neuron);
//       scene.add(neuron);
//     }
    
//     // Create neural connections with gradient effect
//     const connections: THREE.Line[] = [];
//     const maxConnectionDistance = 2.5;
    
//     // Function to create/update connections
//     const updateConnections = (): void => {
//       // Remove existing connections
//       connections.forEach(connection => scene.remove(connection));
//       connections.length = 0;
      
//       // Create new connections based on distance
//       for (let i = 0; i < neurons.length; i++) {
//         for (let j = i + 1; j < neurons.length; j++) {
//           const distance = neurons[i].position.distanceTo(neurons[j].position);
          
//           if (distance < maxConnectionDistance) {
//             // Set opacity and width based on distance
//             const opacity = Math.pow(1 - (distance / maxConnectionDistance), 2) * 0.8;
            
//             // Create gradient material
//             const gradientLineMaterial = new THREE.LineBasicMaterial({
//               color: distance < maxConnectionDistance * 0.5 ? primaryConnectionColor : secondaryConnectionColor,
//               transparent: true,
//               opacity: opacity
//             });
            
//             const points = [neurons[i].position.clone(), neurons[j].position.clone()];
//             const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
//             const line = new THREE.Line(lineGeometry, gradientLineMaterial);
            
//             connections.push(line);
//             scene.add(line);
//           }
//         }
//       }
//     };
    
//     // Create data pulse effect
//     const createPulseEffect = () => {
//       if (neurons.length < 2) return;
      
//       const startNeuronIndex = Math.floor(Math.random() * neurons.length);
//       let endNeuronIndex = Math.floor(Math.random() * neurons.length);
      
//       // Ensure start and end are different
//       while (endNeuronIndex === startNeuronIndex) {
//         endNeuronIndex = Math.floor(Math.random() * neurons.length);
//       }
      
//       const startNeuron = neurons[startNeuronIndex];
//       const endNeuron = neurons[endNeuronIndex];
      
//       const pulseGeometry = new THREE.SphereGeometry(0.04, 8, 8);
//       const pulseMaterial = new THREE.MeshBasicMaterial({
//         color: 0x88ccff,
//         transparent: true,
//         opacity: 0.8
//       });
      
//       const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
//       pulse.position.copy(startNeuron.position);
//       scene.add(pulse);
      
//       // Calculate path
//       const direction = new THREE.Vector3().subVectors(endNeuron.position, startNeuron.position);
//       const distance = direction.length();
//       direction.normalize();
      
//       // Animation
//       let progress = 0;
//       const animatePulse = () => {
//         progress += 0.02;
        
//         if (progress < 1) {
//           // Move along path
//           pulse.position.copy(startNeuron.position).addScaledVector(direction, distance * progress);
//           requestAnimationFrame(animatePulse);
//         } else {
//           // Reached end, remove pulse
//           scene.remove(pulse);
//         }
//       };
      
//       requestAnimationFrame(animatePulse);
//     };
    
//     // Trigger pulse effects periodically
//     const pulseInterval = setInterval(createPulseEffect, 800);
    
//     // Position camera
//     camera.position.z = 10;
    
//     // Add subtle light sources for dimension
//     const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
//     scene.add(ambientLight);
    
//     const directionalLight = new THREE.DirectionalLight(isDarkMode ? 0x88aaff : 0xffffff, 0.8);
//     directionalLight.position.set(0, 10, 10);
//     scene.add(directionalLight);
    
//     // Handle window resize
//     const handleResize = (): void => {
//       if (!mountRef.current) return;
      
//       camera.aspect = window.innerWidth / window.innerHeight;
//       camera.updateProjectionMatrix();
//       renderer.setSize(window.innerWidth, window.innerHeight);
//     };
    
//     window.addEventListener('resize', handleResize);
    
//     // Mouse interaction
//     const raycaster = new THREE.Raycaster();
//     const mouse = new THREE.Vector2();
    
//     const handleMouseMove = (event: MouseEvent): void => {
//       // Calculate mouse position in normalized device coordinates
//       mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
//       mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
//       // Check for intersections
//       raycaster.setFromCamera(mouse, camera);
//       const intersects = raycaster.intersectObjects(neurons);
      
//       // Reset all neurons to default color
//       neurons.forEach(neuron => {
//         const props = neuronProperties.get(neuron);
//         if (props) {
//           (neuron.material as THREE.MeshBasicMaterial).color.set(props.originalColor);
//         }
//       });
      
//       // If mouse intersects with a neuron
//       if (intersects.length > 0) {
//         const hoveredNeuron = intersects[0].object;
//         (hoveredNeuron.material as THREE.MeshBasicMaterial).color.set(nodeHoverColor);
        
//         // Display a random question
//         const randomQuestionIndex = Math.floor(Math.random() * universalQuestions.length);
//         setHoveredQuestion(universalQuestions[randomQuestionIndex]);
//       } else {
//         setHoveredQuestion(null);
//       }
//     };
    
//     window.addEventListener('mousemove', handleMouseMove);
    
//     // Animation loop
//     const animate = (): void => {
//       requestAnimationFrame(animate);
      
//       // Update neuron positions with subtle movement
//       neurons.forEach(neuron => {
//         const props = neuronProperties.get(neuron);
//         if (!props) return;
        
//         neuron.position.add(props.velocity);
        
//         // Pulse effect
//         props.pulsePhase += props.pulseSpeed;
//         const scale = 0.9 + Math.sin(props.pulsePhase) * 0.1;
//         neuron.scale.set(scale, scale, scale);
        
//         // Boundary logic for smoother transitions
//         if (Math.abs(neuron.position.x) > 4) {
//           props.velocity.x *= -1;
//         }
//         if (Math.abs(neuron.position.y) > 4) {
//           props.velocity.y *= -1;
//         }
//         if (Math.abs(neuron.position.z - (Math.floor(neuron.position.z / 3) * 3 - 3)) > 0.5) {
//           props.velocity.z *= -1;
//         }
//       });
      
//       // Update connections
//       updateConnections();
      
//       // Gentle camera movement
//       camera.position.x = Math.sin(Date.now() * 0.0001) * 0.5;
//       camera.position.y = Math.cos(Date.now() * 0.0001) * 0.5;
//       camera.lookAt(scene.position);
      
//       renderer.render(scene, camera);
//     };
    
//     const animationFrame = requestAnimationFrame(animate);
    
//     // Cleanup
//     return () => {
//       window.removeEventListener('resize', handleResize);
//       window.removeEventListener('mousemove', handleMouseMove);
//       cancelAnimationFrame(animationFrame);
//       clearInterval(pulseInterval);
      
//       if (mountRef.current) {
//         while (mountRef.current.firstChild) {
//           mountRef.current.removeChild(mountRef.current.firstChild);
//         }
//       }
//     };
//   }, [theme]); // Re-run when theme changes
  
//   return (
//     <div className="relative w-full h-full">
//       <div ref={mountRef} className="w-full h-full" />
      
//       {/* Heading overlay */}
//       <div className="top-0 right-0 absolute p-8 text-right">
//         <h1 className="font-light text-3xl tracking-wider">
//           UNDERSTAND THE UNIVERSES
//         </h1>
//         <p className="opacity-70 mt-2 text-sm">
//           for my deep research advanced model AI
//         </p>
//       </div>
      
//       {/* Hover question display */}
//       {hoveredQuestion && (
//         <div className="right-0 bottom-10 left-0 absolute text-center">
//           <p className="inline-block bg-opacity-20 backdrop-blur-sm px-6 py-3 rounded-lg font-light text-xl tracking-wide">
//             {hoveredQuestion}
//           </p>
//         </div>
//       )}
//     </div>
//   );
// };

// export default NeuralNetworkAnimation;