import React from 'react';
import Router from 'react-router';
import FormForModel from '../forms/FormForModel.component';
import fieldOverrides from '../config/field-overrides/index';
import fieldOrderNames from '../config/field-config/field-order';
import headerFieldsNames from '../config/field-config/header-fields';
import disabledOnEdit from '../config/disabled-on-edit';
import FormFieldsForModel from '../forms/FormFieldsForModel';
import FormFieldsManager from '../forms/FormFieldsManager';
// import AttributeFields from '../BasicFields/AttributeFields.component';
import {getInstance as getD2} from 'd2/lib/d2';
import modelToEditStore from './modelToEditStore';
import objectActions from './objectActions';
import snackActions from '../Snackbar/snack.actions';
import SaveButton from './SaveButton.component';
import CancelButton from './CancelButton.component';
import Paper from 'material-ui/lib/paper';
import {isString} from 'd2-utils';
import SharingNotification from './SharingNotification.component';
import FormButtons from './FormButtons.component';
import Form from 'd2-ui/lib/forms/Form.component';
import log from 'loglevel';
import FormHeading from './FormHeading';
import camelCaseToUnderscores from 'd2-utils/camelCaseToUnderscores';

// TODO: Gives a flash of the old content when switching models (Should probably display a loading bar)
export default class EditModel extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            modelToEdit: undefined,
            isLoading: true,
        };
    }

    componentWillMount() {
        const modelType = this.props.modelType;

        getD2().then(d2 => {
            // TODO: When the schema exposes the correct field configs (ENUMS) the overrides can be removed and the FormFieldManager can be instantiated by the FormForModel Component
            const formFieldsManager = new FormFieldsManager(new FormFieldsForModel(d2.models));
            formFieldsManager.setHeaderFields(headerFieldsNames.for(modelType));
            formFieldsManager.setFieldOrder(fieldOrderNames.for(modelType));

            for (const [fieldName, overrideConfig] of fieldOverrides.for(modelType)) {
                formFieldsManager.addFieldOverrideFor(fieldName, overrideConfig);
            }

            this.disposable = modelToEditStore
                .subscribe((modelToEdit) => {
                    this.setState({
                        fieldConfigs: formFieldsManager.getFormFieldsForModel(modelToEdit)
                            .map(fieldConfig => {
                                if (this.props.modelId !== 'add' && disabledOnEdit.for(modelType).indexOf(fieldConfig.name) !== -1) {
                                    fieldConfig.fieldOptions.disabled = true;
                                }
                                return fieldConfig;
                            }),
                        modelToEdit: modelToEdit,
                        isLoading: false,
                    });
                }, (errorMessage) => {
                    snackActions.show({message: errorMessage});
                });

            this.setState({
                formFieldsManager: formFieldsManager,
            });
        });
    }

    componentWillReceiveProps() {
        this.setState({
            isLoading: true,
        });
    }

    componentWillUnmount() {
        this.disposable && this.disposable.dispose();
    }

    render() {
        const formPaperStyle = {
            width: '80%',
            margin: '3rem auto 2rem',
            padding: '2rem 5rem 4rem',
        };

        const renderForm = () => {
            if (this.state.isLoading) {

                return (
                    <CircularProgress mode="indeterminate" />
                );
            }

            const saveButtonStyle = {
                marginRight: '1rem',
            };

            return (
                <Paper style={formPaperStyle}>
                    <FormHeading text={camelCaseToUnderscores(this.props.modelType)} />
                    <Form source={this.state.modelToEdit} fieldConfigs={this.state.fieldConfigs} onFormFieldUpdate={this._updateForm.bind(this)}>
                        <FormButtons>
                            <SaveButton style={saveButtonStyle} onClick={this.saveAction.bind(this)}/>
                            <CancelButton onClick={this.closeAction.bind(this)}/>
                        </FormButtons>
                    </Form>
                </Paper>
            );
        };

        const wrapStyle = {
            paddingTop: '2rem',
        };

        return (
            <div style={wrapStyle}>
                <SharingNotification style={formPaperStyle} modelType={this.props.modelType} />
                {this.state.isLoading ? 'Loading data...' : renderForm()}
            </div>
        );
    }

    _updateForm(fieldName, value) {
        objectActions.update({fieldName, value});
    }

    saveAction(event) {
        event.preventDefault();

        objectActions.saveObject({id: this.props.modelId})
            .subscribe(
            (message) => snackActions.show({message, action: 'Ok!'}),
            (errorMessage) => {
                if (isString(errorMessage)) {
                    log.debug(errorMessage.messages);
                    snackActions.show({message: errorMessage});
                }

                if (errorMessage.messages && errorMessage.messages.length > 0) {
                    log.debug(errorMessage.messages);
                    snackActions.show({message: `${errorMessage.messages[0].property}: ${errorMessage.messages[0].message} `});
                }
            }
        );
    }

    closeAction() {
        event.preventDefault();

        Router.HashLocation.push(['/list', this.props.modelType].join('/'));
    }

    extraFieldsForModelType() {
        return undefined;
    }
}
EditModel.propTypes = {
    modelId: React.PropTypes.string.isRequired,
    modelType: React.PropTypes.string.isRequired,
};
