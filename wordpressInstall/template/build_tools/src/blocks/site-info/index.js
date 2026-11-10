import { registerBlockType } from '@wordpress/blocks';

import metadata from './block.json';
import Edit from './edit.js';
import './style.scss';

// Dynamic block: everything is rendered by render.php from Site Settings.
registerBlockType( metadata.name, { edit: Edit, save: () => null } );
