/**
 * WordPress dependencies
 */
import { forwardRef } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { useBlockNavigationContext } from './context';
import BlockNavigationBlockSlot from './block-slot';
import BlockNavigationBlockSelectButton from './block-select-button';

const BlockNavigationBlockContents = forwardRef(
	(
		{
			onClick,
			block,
			isSelected,
			position,
			siblingBlockCount,
			level,
			...props
		},
		ref
	) => {
		const {
			__experimentalFeatures: withBlockNavigationSlots,
		} = useBlockNavigationContext();

		return withBlockNavigationSlots ? (
			<BlockNavigationBlockSlot
				ref={ ref }
				className="block-editor-block-navigation-block-contents"
				block={ block }
				onClick={ onClick }
				isSelected={ isSelected }
				position={ position }
				siblingBlockCount={ siblingBlockCount }
				level={ level }
				{ ...props }
			/>
		) : (
			<BlockNavigationBlockSelectButton
				ref={ ref }
				className="block-editor-block-navigation-block-contents"
				block={ block }
				onClick={ onClick }
				isSelected={ isSelected }
				position={ position }
				siblingBlockCount={ siblingBlockCount }
				level={ level }
				{ ...props }
			/>
		);
	}
);

export default BlockNavigationBlockContents;
