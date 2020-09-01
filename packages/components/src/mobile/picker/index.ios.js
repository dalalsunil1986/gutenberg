/**
 * External dependencies
 */
import { ActionSheetIOS } from 'react-native';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Component } from '@wordpress/element';

class Picker extends Component {
	presentPicker() {
		const {
			options,
			onChange,
			title,
			destructiveButtonIndex,
			disabledButtonIndices,
			anchor,
			onOpen,
			onClose,
		} = this.props;
		const labels = options.map( ( { label } ) => label );
		const fullOptions = [ __( 'Cancel' ) ].concat( labels );

		ActionSheetIOS.showActionSheetWithOptions(
			{
				title,
				options: fullOptions,
				cancelButtonIndex: 0,
				destructiveButtonIndex,
				disabledButtonIndices,
				anchor,
			},
			( buttonIndex ) => {
				if ( buttonIndex === 0 ) {
					onClose();
					return;
				}

				const selected = options[ buttonIndex - 1 ];
				onChange( selected.value );
			}
		);
		if ( onOpen ) {
			onOpen();
		}
	}

	render() {
		return null;
	}
}

export default Picker;
