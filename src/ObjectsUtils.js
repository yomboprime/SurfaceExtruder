import {
	Vector3
} from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { LDrawLoader } from 'three/examples/jsm/loaders/LDrawLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

class ObjectsUtils {

	constructor( game ) {

		this.game = game;

		this.tempVec1 = new Vector3();

	}

	getFilenameExtension( path ) {

		path = path || "";

		const pathLastIndexOfDot = path.lastIndexOf( "." );

		if ( pathLastIndexOfDot > 0 && path.length > pathLastIndexOfDot + 1) {

			return path.substring( pathLastIndexOfDot + 1 );

		}
		else return "";

	}


	isGLBExtension( extension ) {

		return extension === 'glb';

	}

	isDAEExtension( extension ) {

		return extension === 'dae';

	}

	isLDrawExtension( extension ) {

		return [
			'ldraw',
			'dat',
			'mpd'
		].includes( extension );

	}

	loadModel( path, onLoaded ) {

		const extensionLowercase = this.getFilenameExtension( path ).toLowerCase();

		if ( this.isGLBExtension( extensionLowercase ) ) this.loadGLB( path, onLoaded );
		else if ( this.isDAEExtension( extensionLowercase ) ) this.loadDAE( path, onLoaded );
		else if ( this.isLDrawExtension( extensionLowercase ) ) this.loadLDraw( path, onLoaded );
		else onLoaded( null );

	}

	loadGLB( path, onLoaded ) {

		new GLTFLoader().load( path, function ( gltf ) {

			const object = gltf.scene;
			onLoaded( object );

		}, undefined, ( error ) => {

			console.error( error );

		} );

	}

	loadDAE( path, onLoaded ) {

		new ColladaLoader().load( path, function ( dae ) {

			const object = dae.scene;
			onLoaded( object );

		}, undefined, ( error ) => {

			console.error( error );

		} );

	}

	loadLDraw( path, onLoaded ) {

		const loader = new LDrawLoader();
		loader.smoothNormals = false;

		loader.load( path, function ( ldraw ) {

			const object = ldraw;
			onLoaded( object );

		}, undefined, ( error ) => {

			console.error( error );

		} );

	}

	loadOBJ( path, objFilename, onLoaded ) {

		new OBJLoader()
		.setPath( path )
		.load( objFilename, function ( object ) {

			onLoaded( object );

		} );

	}

	loadOBJMTL( path, objFilename, onLoaded ) {

		const mtlFilename = objFilename.substring( 0, objFilename.lastIndexOf( '.' ) ) + '.mtl';

		new MTLLoader()
		.setPath( path )
		.load( mtlFilename, function ( materials ) {

			materials.preload();

			new OBJLoader()
			.setMaterials( materials )
			.setPath( path )
			.load( objFilename, function ( object ) {

				onLoaded( object );

			} );

		} );

	}

}

export { ObjectsUtils };
