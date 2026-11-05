import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';

import metadata from './block.json';
import Edit from './edit.js';

registerBlockType( metadata.name, {
	edit: Edit,
	// Dynamic block: render.php outputs <section> and the container; only the
	// inner blocks are saved in post content.
	save: () => <InnerBlocks.Content />,
} );
