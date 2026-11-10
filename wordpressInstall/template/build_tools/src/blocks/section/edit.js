import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

export default function Edit() {
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps( { className: 'container' } );

	return (
		<section { ...blockProps }>
			<div { ...innerBlocksProps } />
		</section>
	);
}
