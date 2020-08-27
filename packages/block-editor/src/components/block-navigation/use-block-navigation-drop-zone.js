/**
 * WordPress dependencies
 */
import { __unstableUseDropZone as useDropZone } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useMemo, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { getDistanceToNearestEdge } from '../../utils/math';
import useOnBlockDrop from '../use-on-block-drop';

function useDropTargetBlocksData( ref, position, dragEventType ) {
	const {
		getBlockRootClientId,
		getBlockIndex,
		getBlockCount,
		getDraggedBlockClientIds,
		canInsertBlocks,
	} = useSelect( ( select ) => {
		const {
			canInsertBlocks: _canInsertBlocks,
			getBlockRootClientId: _getBlockRootClientId,
			getBlockIndex: _getBlockIndex,
			getBlockCount: _getBlockCount,
			getDraggedBlockClientIds: _getDraggedBlockClientIds,
		} = select( 'core/block-editor' );
		return {
			canInsertBlocks: _canInsertBlocks,
			getBlockRootClientId: _getBlockRootClientId,
			getBlockIndex: _getBlockIndex,
			getBlockCount: _getBlockCount,
			getDraggedBlockClientIds: _getDraggedBlockClientIds,
		};
	}, [] );

	// Compute data about blocks only when the user
	// starts dragging, as determined by `hasPosition`.
	const hasPosition = !! position;
	return useMemo( () => {
		if ( ! ref.current || ! hasPosition ) {
			return;
		}

		const isBlockDrag = dragEventType === 'default';

		const draggedBlockClientIds = isBlockDrag
			? getDraggedBlockClientIds()
			: undefined;

		const blockElements = Array.from(
			ref.current.querySelectorAll( '[data-block]' )
		);

		return blockElements.map( ( blockElement ) => {
			const clientId = blockElement.dataset.block;
			const rootClientId = getBlockRootClientId( clientId );

			return {
				clientId,
				rootClientId,
				blockIndex: getBlockIndex( clientId, rootClientId ),
				element: blockElement,
				isDraggedBlock: isBlockDrag
					? draggedBlockClientIds.includes( clientId )
					: false,
				innerBlockCount: getBlockCount( clientId ),
				canInsertDraggedBlocksAsSibling: isBlockDrag
					? canInsertBlocks( draggedBlockClientIds, rootClientId )
					: true,
				canInsertDraggedBlocksAsChild: isBlockDrag
					? canInsertBlocks( draggedBlockClientIds, clientId )
					: true,
			};
		} );
	}, [ hasPosition ] );
}

function isPointContainedByRect( point, rect ) {
	return (
		rect.left <= point.x &&
		rect.right >= point.x &&
		rect.top <= point.y &&
		rect.bottom >= point.y
	);
}

function isNestingGesture( point, rect ) {
	const blockCenterX = rect.left + rect.width / 2;
	return point.x > blockCenterX;
}

// Block navigation is always a vertical list, so only allow dropping
// to the above or below a block.
const ALLOWED_DROP_EDGES = [ 'top', 'bottom' ];

function getBlockNavigationDropTarget( blocksData, position ) {
	let candidateEdge;
	let candidateBlockData;
	let candidateDistance;
	let candidateRect;

	for ( const blockData of blocksData ) {
		if ( blockData.isDraggedBlock ) {
			continue;
		}

		const rect = blockData.element.getBoundingClientRect();
		const [ distance, edge ] = getDistanceToNearestEdge(
			position,
			rect,
			ALLOWED_DROP_EDGES
		);

		const isCursorWithinBlock = isPointContainedByRect( position, rect );
		if (
			candidateDistance === undefined ||
			distance < candidateDistance ||
			isCursorWithinBlock
		) {
			candidateDistance = distance;

			const index = blocksData.indexOf( blockData );
			const previousBlockData = blocksData[ index - 1 ];

			// If dragging near the top of a block and the preceding block
			// is at the same level, use the preceding block as the candidate
			// instead, as later it makes determining a nesting drop easier.
			if (
				edge === 'top' &&
				previousBlockData &&
				previousBlockData.rootClientId === blockData.rootClientId &&
				! previousBlockData.isDraggedBlock
			) {
				candidateBlockData = previousBlockData;
				candidateEdge = 'bottom';
				candidateRect = previousBlockData.element.getBoundingClientRect();
			} else {
				candidateBlockData = blockData;
				candidateEdge = edge;
				candidateRect = rect;
			}

			// If the mouse position is within the block, break early
			// as the user would intend to drop either before or after
			// this block.
			//
			// This solves an issue where some rows in the block navigation
			// tree overlap slightly due to sub-pixel rendering.
			if ( isCursorWithinBlock ) {
				break;
			}
		}
	}

	if ( ! candidateBlockData ) {
		return;
	}

	const isDraggingBelow = candidateEdge === 'bottom';

	// If the user is dragging towards the bottom of the block check whether
	// they might be trying to nest the block as a child.
	// If the block already has inner blocks, this should always be treated
	// as nesting since the next block in the tree will be the first child.
	if (
		isDraggingBelow &&
		candidateBlockData.canInsertDraggedBlocksAsChild &&
		( candidateBlockData.innerBlockCount > 0 ||
			isNestingGesture( position, candidateRect ) )
	) {
		return {
			rootClientId: candidateBlockData.clientId,
			blockIndex: 0,
			position: 'inside',
		};
	}

	// If dropping as a sibling, but block cannot be inserted in
	// this context, return early.
	if ( ! candidateBlockData.canInsertDraggedBlocksAsSibling ) {
		return;
	}

	const offset = isDraggingBelow ? 1 : 0;
	return {
		rootClientId: candidateBlockData.rootClientId,
		clientId: candidateBlockData.clientId,
		blockIndex: candidateBlockData.blockIndex + offset,
		position: candidateEdge,
	};
}

export default function useBlockNavigationDropZone( ref ) {
	const [ target = {}, setTarget ] = useState();
	const {
		rootClientId: targetRootClientId,
		blockIndex: targetBlockIndex,
	} = target;

	const dropEventHandlers = useOnBlockDrop(
		targetRootClientId,
		targetBlockIndex
	);

	const { position, type: dragEventType } = useDropZone( {
		element: ref,
		withPosition: true,
		...dropEventHandlers,
	} );

	const blocksData = useDropTargetBlocksData( ref, position, dragEventType );

	// Calculate the drop target based on the drag position.
	useEffect( () => {
		if ( position ) {
			const newTarget = getBlockNavigationDropTarget(
				blocksData,
				position
			);

			if ( target ) {
				setTarget( newTarget );
			}
		}
	}, [ position ] );

	if ( position ) {
		return target;
	}
}
