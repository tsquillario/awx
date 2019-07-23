import React, { Component, Fragment } from 'react';
import { withRouter } from 'react-router-dom';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import {
  Card,
  PageSection,
  PageSectionVariants,
} from '@patternfly/react-core';

import { OrganizationsAPI } from '@api';
import AlertModal from '@components/AlertModal';
import DataListToolbar from '@components/DataListToolbar';
import PaginatedDataList, {
  ToolbarAddButton,
  ToolbarDeleteButton,
} from '@components/PaginatedDataList';
import { getQSConfig, parseQueryString } from '@util/qs';

import OrganizationListItem from './OrganizationListItem';

const QS_CONFIG = getQSConfig('organization', {
  page: 1,
  page_size: 5,
  order_by: 'name',
});

class OrganizationsList extends Component {
  constructor (props) {
    super(props);

    this.state = {
      hasContentLoading: true,
      hasContentError: false,
      hasDeletionError: false,
      organizations: [],
      selected: [],
      itemCount: 0,
      actions: null,
    };

    this.handleSelectAll = this.handleSelectAll.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.handleOrgDelete = this.handleOrgDelete.bind(this);
    this.handleDeleteErrorClose = this.handleDeleteErrorClose.bind(this);
    this.loadOrganizations = this.loadOrganizations.bind(this);
  }

  componentDidMount () {
    this.loadOrganizations();
  }

  componentDidUpdate (prevProps) {
    const { location } = this.props;
    if (location !== prevProps.location) {
      this.loadOrganizations();
    }
  }

  handleSelectAll (isSelected) {
    const { organizations } = this.state;

    const selected = isSelected ? [...organizations] : [];
    this.setState({ selected });
  }

  handleSelect (row) {
    const { selected } = this.state;

    if (selected.some(s => s.id === row.id)) {
      this.setState({ selected: selected.filter(s => s.id !== row.id) });
    } else {
      this.setState({ selected: selected.concat(row) });
    }
  }

  handleDeleteErrorClose () {
    this.setState({ hasDeletionError: false });
  }

  async handleOrgDelete () {
    const { selected } = this.state;

    this.setState({ hasContentLoading: true, hasDeletionError: false });
    try {
      await Promise.all(selected.map((org) => OrganizationsAPI.destroy(org.id)));
    } catch (err) {
      this.setState({ hasDeletionError: true });
    } finally {
      await this.loadOrganizations();
    }
  }

  async loadOrganizations () {
    const { location } = this.props;
    const { actions: cachedActions } = this.state;
    const params = parseQueryString(QS_CONFIG, location.search);

    let optionsPromise;
    if (cachedActions) {
      optionsPromise = Promise.resolve({ data: { actions: cachedActions } });
    } else {
      optionsPromise = OrganizationsAPI.readOptions();
    }

    const promises = Promise.all([
      OrganizationsAPI.read(params),
      optionsPromise,
    ]);

    this.setState({ hasContentError: false, hasContentLoading: true });
    try {
      const [{ data: { count, results } }, { data: { actions } }] = await promises;
      this.setState({
        actions,
        itemCount: count,
        organizations: results,
        selected: [],
      });
    } catch (err) {
      this.setState(({ hasContentError: true }));
    } finally {
      this.setState({ hasContentLoading: false });
    }
  }

  render () {
    const {
      medium,
    } = PageSectionVariants;
    const {
      actions,
      itemCount,
      hasContentError,
      hasContentLoading,
      hasDeletionError,
      selected,
      organizations,
    } = this.state;
    const { match, i18n } = this.props;

    const canAdd = actions && Object.prototype.hasOwnProperty.call(actions, 'POST');
    const isAllSelected = selected.length === organizations.length;

    return (
      <Fragment>
        <PageSection variant={medium}>
          <Card>
            <PaginatedDataList
              hasContentError={hasContentError}
              hasContentLoading={hasContentLoading}
              items={organizations}
              itemCount={itemCount}
              itemName="organization"
              qsConfig={QS_CONFIG}
              toolbarColumns={[
                { name: i18n._(t`Name`), key: 'name', isSortable: true, isSearchable: true },
                { name: i18n._(t`Modified`), key: 'modified', isSortable: true, isNumeric: true },
                { name: i18n._(t`Created`), key: 'created', isSortable: true, isNumeric: true },
              ]}
              renderToolbar={(props) => (
                <DataListToolbar
                  {...props}
                  showSelectAll
                  isAllSelected={isAllSelected}
                  onSelectAll={this.handleSelectAll}
                  additionalControls={[
                    <ToolbarDeleteButton
                      key="delete"
                      onDelete={this.handleOrgDelete}
                      itemsToDelete={selected}
                      itemName="Organization"
                    />,
                    canAdd
                      ? <ToolbarAddButton key="add" linkTo={`${match.url}/add`} />
                      : null,
                  ]}
                />
              )}
              renderItem={(o) => (
                <OrganizationListItem
                  key={o.id}
                  organization={o}
                  detailUrl={`${match.url}/${o.id}`}
                  isSelected={selected.some(row => row.id === o.id)}
                  onSelect={() => this.handleSelect(o)}
                />
              )}
              emptyStateControls={
                canAdd ? <ToolbarAddButton key="add" linkTo={`${match.url}/add`} />
                  : null
              }
            />
          </Card>
        </PageSection>
        <AlertModal
          isOpen={hasDeletionError}
          variant="danger"
          title={i18n._(t`Error!`)}
          onClose={this.handleDeleteErrorClose}
        >
          {i18n._(t`Failed to delete one or more organizations.`)}
        </AlertModal>
      </Fragment>
    );
  }
}

export { OrganizationsList as _OrganizationsList };
export default withI18n()(withRouter(OrganizationsList));
