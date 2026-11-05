import { __ } from '@wordpress/i18n';
import { InnerBlocks, RichText, useBlockProps } from '@wordpress/block-editor';

const TEMPLATE = [ [ 'core/paragraph' ] ];

export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps( { className: 'callout' } );

	return (
		<aside { ...blockProps }>
			<div className="container">
				<RichText
					tagName="h2"
					className="callout__title"
					placeholder={ __( 'Callout heading', '__SLUG__' ) }
					value={ attributes.title }
					onChange={ ( title ) => setAttributes( { title } ) }
					allowedFormats={ [ 'core/bold', 'core/italic' ] }
				/>
				<InnerBlocks template={ TEMPLATE } />
			</div>
		</aside>
	);
}
