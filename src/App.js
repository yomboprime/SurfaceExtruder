
import {
	PerspectiveCamera,
	Vector3,
	Color,
	Ray,
	BufferGeometry,
	Float32BufferAttribute,
	BoxGeometry,
	Mesh,
	MeshLambertMaterial,
	DirectionalLight,
	Scene,
	WebGLRenderer,
	sRGBEncoding
} from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

let
camera,
controls,
renderer,
scene,
inputFiles,
currentMaterial,
loadMeshButton,
saveMeshButton,
widthInput,
iterInput,
processingMessageDiv,
bellAudio,
currentObject;

const v1 = new Vector3();
const v2 = new Vector3();
const v3 = new Vector3();
const v4 = new Vector3();
const v5 = new Vector3();
const v6 = new Vector3();
const n = new Vector3();
const ray = new Ray();
const _edge1 = new Vector3();
const _edge2 = new Vector3();
const _normal = new Vector3();
const _diff = new Vector3();

function initApp() {

	camera = new PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.05, 10000 );
	camera.position.set( 75, 100, 200 );

	renderer = new WebGLRenderer( { antialias: true } );

	renderer.physicallyCorrectLights = true;
	renderer.outputEncoding = sRGBEncoding;
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	scene = new Scene();
	scene.background = new Color( 0x4f6fff );

	currentMaterial = new MeshLambertMaterial();

	const light = new DirectionalLight( );
	light.position.set( 1, 2, 1.45 );
	scene.add( light );

	const light2 = new DirectionalLight( 0xFFFFFF, 0.7 );
	light2.position.set( - 3, - 1.5, - 2 );
	scene.add( light2 );

	controls = new OrbitControls( camera, renderer.domElement );

	window.addEventListener( 'resize', onWindowResize, false );

	inputFiles = document.createElement( 'input' );
	inputFiles.type = "file";
	inputFiles.onchange = onFilesLoaded;

	const contentDiv = document.createElement( 'div' );
	contentDiv.innerHTML = '<a href="https://github.com/yomboprime/SurfaceExtruder">SurfaceExtruder home page: Go here.</a><br/>Bell sound by InspectorJ, Creative Commons Attribution 4.0';
	contentDiv.style.position = "absolute";
	contentDiv.style.top = "0px";
	contentDiv.style.left = "0px";
	contentDiv.style.color = "white";
	contentDiv.style.backgroundColor = "black";
	contentDiv.style.opacity = "0.5";
	document.body.appendChild( contentDiv );

	const paramsDiv = document.createElement( 'div' );
	paramsDiv.style.width = "100%";

	const widthDiv = document.createElement( 'div' );
	const widthSpan = document.createElement( 'span' );
	widthSpan.innerHTML = 'Width: ';
	widthInput = document.createElement( 'input' );
	widthInput.type = 'number';
	widthInput.value = 5;
	widthDiv.appendChild( widthSpan );
	widthDiv.appendChild( widthInput );

	const iterDiv = document.createElement( 'div' );
	const iterSpan = document.createElement( 'span' );
	iterSpan.innerHTML = 'Iterations: ';
	iterInput = document.createElement( 'input' );
	iterInput.type = 'number';
	iterInput.value = 10;
	iterInput.min = 1;
	iterInput.max = 15;
	iterInput.step = 1;
	iterDiv.appendChild( iterSpan );
	iterDiv.appendChild( iterInput );

	paramsDiv.appendChild( widthDiv );
	paramsDiv.appendChild( iterDiv );

	contentDiv.appendChild( paramsDiv );

	const finalDiv = document.createElement( 'div' );
	finalDiv.style.width = "100%";

	loadMeshButton = document.createElement( 'button' );
	loadMeshButton.innerHTML = "Load a model from STL file...";
	finalDiv.appendChild( loadMeshButton );

	saveMeshButton = document.createElement( 'button' );
	saveMeshButton.innerHTML = "Save result to STL...";
	saveMeshButton.disabled = true;
	finalDiv.appendChild( saveMeshButton );

	contentDiv.appendChild( finalDiv );

	loadMeshButton.onclick = loadMesh;
	saveMeshButton.onclick = saveSTL;

	processingMessageDiv = document.createElement( 'div' );
	processingMessageDiv.innerHTML = 'Processing mesh...';
	processingMessageDiv.style.fontSize = '1.5em';
	processingMessageDiv.style.position = "absolute";
	processingMessageDiv.style.top = "50%";
	processingMessageDiv.style.left = "50%";
	processingMessageDiv.style.color = "white";
	processingMessageDiv.style.backgroundColor = "black";
	processingMessageDiv.style.opacity = "0.5";
	processingMessageDiv.style.display = 'none';
	document.body.appendChild( processingMessageDiv );

	onWindowResize();
	animate();

};

function showProcessing( show ) {

	if ( show ) processingMessageDiv.style.display = 'block';
	else processingMessageDiv.style.display = 'none';

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {

	requestAnimationFrame( animate );

	renderer.render( scene, camera );

}

function loadMesh() {

	if ( ! bellAudio ) bellAudio = new Audio( 'bell.ogg' );

	inputFiles.click();

}

function onFilesLoaded( event ) {

	showProcessing( true );

	loadMeshButton.disabled = true;
	saveMeshButton.disabled = true;

	const files = event.target.files;

	if ( ! files || files.length === 0 ) return;

	const file = files[ 0 ];

	const reader = new FileReader();

	reader.onload = ( e ) => {

		const fileContents = e.target.result;

		parseSTLFile( fileContents, file.name );

	}

	reader.onerror = function( e ) {

		alert( "Error loading file " + file.name );
		showProcessing( false );

	};

	reader.readAsArrayBuffer( file );

}

function parseSTLFile( fileContents, fileName ) {

	const geometry = new STLLoader().parse( fileContents );
	if ( ! geometry ) {

		showProcessing( false );
		alert( "Error parsing file " + fileName );
		return;

	}

	extrudeGeometry( geometry, widthInput.value, iterInput.value );

}

function extrudeGeometry( geometry, width, maxIterations ) {

	geometry = mergeVertices( geometry );

	const indices = geometry.getIndex().array;
	const verts = geometry.getAttribute( 'position' ).array;
	let normals = geometry.getAttribute( 'normal' ).array;

	function edgeIsIsolated( a, b ) {

		let numEdges = 0;
		for ( let i = 0, il = indices.length; i < il; i += 3 ) {

			const i0 = indices[ i ];
			const i1 = indices[ i + 1 ];
			const i2 = indices[ i + 2 ];

			if (
				( i0 === a && i1 === b ) ||
				( i1 === a && i0 === b ) ||
				( i0 === a && i2 === b ) ||
				( i1 === a && i2 === b ) ||
				( i2 === a && i0 === b ) ||
				( i2 === a && i1 === b ) ) numEdges ++;

		}

		return numEdges === 1;

	}

	let widthIncrement = width;
	let newGeometry;
	let bestGeometry;
	for ( let iterations = 0; iterations < maxIterations; iterations ++ ) {

		newGeometry = new BufferGeometry();
		const newVerts = [];
		let index = 0;
		for ( let i = 0, il = indices.length; i < il; i += 3 ) {

			const a = indices[ i ];
			const b = indices[ i + 1 ];
			const c = indices[ i + 2 ];
			v1.fromArray( verts, a * 3 );
			v2.fromArray( verts, b * 3 );
			v3.fromArray( verts, c * 3 );

			n.fromArray( normals, indices[ i ] * 3 ).normalize();
			v4.copy( n ).multiplyScalar( width ).add( v1 );

			n.fromArray( normals, indices[ i + 1 ] * 3 ).normalize();
			v5.copy( n ).multiplyScalar( width ).add( v2 );

			n.fromArray( normals, indices[ i + 2 ] * 3 ).normalize();
			v6.copy( n ).multiplyScalar( width ).add( v3 );

			function pushTriangle( a, b, c ) {

				newVerts.push( a.x, a.y, a.z );
				newVerts.push( b.x, b.y, b.z );
				newVerts.push( c.x, c.y, c.z );

			}

			pushTriangle( v1, v3, v2 );
			pushTriangle( v4, v5, v6 );

			if ( edgeIsIsolated( a, b ) ) {

				pushTriangle( v1, v2, v4 );
				pushTriangle( v2, v5, v4 );

			}

			if ( edgeIsIsolated( a, c ) ) {

				pushTriangle( v1, v4, v3 );
				pushTriangle( v3, v4, v6 );

			}

			if ( edgeIsIsolated( b, c ) ) {

				pushTriangle( v3, v6, v2 );
				pushTriangle( v2, v6, v5 );

			}

		}

		newGeometry.setAttribute( 'position', new Float32BufferAttribute( newVerts, 3 ) );
		newGeometry = mergeVertices( newGeometry );
		addUVs( newGeometry );
		newGeometry.computeVertexNormals();

		widthIncrement *= 0.5;

		const doesAutointersect = autoIntersects( newGeometry );
		if ( doesAutointersect ) width -= widthIncrement;
		else {

			bestGeometry = newGeometry;

			if ( iterations > 0 ) width += widthIncrement;
			else break;

		}

	}

	if ( ! bestGeometry ) {

		showProcessing( false );
		loadMeshButton.disabled = false;
		bellAudio.play();
		alert( "Could not make mesh don't self-intersect. Can't give mesh output." );

	}
	else {

		currentObject = new Mesh( bestGeometry, currentMaterial );

		const sceneGeometry = bestGeometry.toNonIndexed();
		sceneGeometry.computeVertexNormals();
		scene.add( new Mesh( sceneGeometry, currentMaterial ) );

		showProcessing( false );
		saveMeshButton.disabled = false;
		bellAudio.play();
		alert( "Operation succesful." );

	}

}

function addUVs( geometry ) {

	if ( ! geometry.getAttribute( 'uv' ) ) {

		const numVertices = Math.floor( geometry.getAttribute( 'position' ).array.length / 3 );
		const uvs = [];
		for ( let i = 0; i < 2 * numVertices; i ++ ) uvs.push( 0.0 );
		geometry.setAttribute( 'uv', new Float32BufferAttribute( uvs, 2 ) );

	}

}

function rayIntersectTriangle( ray, a, b, c, target ) {

	// Compute the offset origin, edges, and normal.

	// from https://github.com/pmjoniak/GeometricTools/blob/master/GTEngine/Include/Mathematics/GteIntrRay3Triangle3.h

	_edge1.subVectors( b, a );
	_edge2.subVectors( c, a );
	_normal.crossVectors( _edge1, _edge2 );

	// Solve Q + t*D = b1*E1 + b2*E2 (Q = kDiff, D = ray direction,
	// E1 = kEdge1, E2 = kEdge2, N = Cross(E1,E2)) by
	//   |Dot(D,N)|*b1 = sign(Dot(D,N))*Dot(D,Cross(Q,E2))
	//   |Dot(D,N)|*b2 = sign(Dot(D,N))*Dot(D,Cross(E1,Q))
	//   |Dot(D,N)|*t = -sign(Dot(D,N))*Dot(Q,N)
	let DdN = ray.direction.dot( _normal );
	let sign;

	if ( DdN > 0 ) {

		sign = 1;

	} else if ( DdN < 0 ) {

		sign = - 1;
		DdN = - DdN;

	} else {

		return null;

	}

	_diff.subVectors( ray.origin, a );
	const DdQxE2 = sign * ray.direction.dot( _edge2.crossVectors( _diff, _edge2 ) );

	// b1 < 0, no intersection
	if ( DdQxE2 < Number.EPSILON ) {

		return null;

	}

	const DdE1xQ = sign * ray.direction.dot( _edge1.cross( _diff ) );

	// b2 < 0, no intersection
	if ( DdE1xQ < Number.EPSILON ) {

		return null;

	}

	// b1+b2 > 1, no intersection
	if ( DdQxE2 + DdE1xQ > DdN - Number.EPSILON ) {

		return null;

	}

	// Line intersects triangle, check if ray does.
	const QdN = - sign * _diff.dot( _normal );

	// t < 0, no intersection
	if ( QdN < 0 ) {

		return null;

	}

	// Ray intersects triangle.
	return ray.at( QdN / DdN, target );

}

function autoIntersects( geometry ) {

	const indices = geometry.getIndex().array;
	const verts = geometry.getAttribute( 'position' ).array;

	for ( let i = 0, il = indices.length; i < il; i += 3 ) {

		const a = indices[ i ];
		const b = indices[ i + 1 ];
		const c = indices[ i + 2 ];
		v1.fromArray( verts, a * 3 );
		v2.fromArray( verts, b * 3 );
		v3.fromArray( verts, c * 3 );

		if ( triangleEdgesIntersects( a, b, c, v1, v2, v3 ) ) return true;

	}

	return false;

	function triangleEdgesIntersects( a, b, c, p1, p2, p3 ) {

		for ( let i = 0, il = indices.length; i < il; i += 3 ) {

			const i0 = indices[ i ];
			const i1 = indices[ i + 1 ];
			const i2 = indices[ i + 2 ];

			if (
				i0 === a || i1 === a || i2 === a ||
				i0 === b || i1 === b || i2 === b ||
				i0 === c || i1 === c || i2 === c ) continue;

			v4.fromArray( verts, i0 * 3 );
			v5.fromArray( verts, i1 * 3 );
			v6.fromArray( verts, i2 * 3 );

			if ( edgeIntersectsTriangle( p1, p2, v4, v5, v6 ) ) return true;
			if ( edgeIntersectsTriangle( p1, p3, v4, v5, v6 ) ) return true;
			if ( edgeIntersectsTriangle( p2, p3, v4, v5, v6 ) ) return true;

		}

		return false;

		function edgeIntersectsTriangle( p1, p2, pa, pb, pc ) {

			ray.origin.copy( p1 );
			ray.direction.copy( p2 ).sub( p1 )
			const l = ray.direction.length();
			ray.direction.normalize();

			if ( rayIntersectTriangle( ray, pa, pb, pc, n ) !== null ) {

				const d = n.sub( ray.origin ).dot( ray.direction );
				if ( d > Number.EPSILON && d < l - Number.EPSILON ) {

					return true;

				}

			}

			return false;

		}

	}

}

function mergeVertices( geometry, tolerance = 0.0001 ) {

	const verts = geometry.getAttribute( 'position' ).array;
	const newVerts = [];
	const newIndices = [];
	let lastIndex = 0;
	for ( let i = 0, il = verts.length; i < il; i += 3 ) {

		v1.fromArray( verts, i );

		let index = - 1;
		for ( let j = 0, jl = newVerts.length; j < jl; j += 3 ) {

			v2.fromArray( newVerts, j );

			const d = v1.distanceTo( v2 );
			if ( d < tolerance ) {

				index = Math.floor( j / 3 );
				break;

			}

		}

		if ( index < 0 ) {

			index = lastIndex ++;
			newVerts.push( v1.x, v1.y, v1.z );

		}

		newIndices.push( index );

	}

	const newGeometry = new BufferGeometry();
	newGeometry.setIndex( newIndices );
	newGeometry.setAttribute( 'position', new Float32BufferAttribute( newVerts, 3 ) );
	addUVs( newGeometry );
	newGeometry.computeVertexNormals();

	return newGeometry;

}

function saveSTL() {

	if ( ! currentObject ) return;

	const exporter = new STLExporter();
	const data = exporter.parse( currentObject, { binary: true } );
	saveFile( "output.stl", new Blob( [ data ], { type: "model/stl" } ) );

}

function saveFile( fileName, blobContents ) {

	const link = window.document.createElement( "a" );
	link.href = window.URL.createObjectURL( blobContents );
	link.download = fileName;
	document.body.appendChild( link );
	link.click();
	document.body.removeChild( link );

}

export default initApp;
