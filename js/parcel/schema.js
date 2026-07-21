/* js/parcel/schema.js
 * Canonical parcel data schema — field definitions, types, display formatting.
 * window.PARCEL_SCHEMA is the single source of truth for all parcel field metadata.
 */
window.PARCEL_SCHEMA = (function () {
  'use strict';

  const FMT = {
    string:   v => (v == null || v === '') ? '—' : String(v),
    number:   v => v == null ? '—' : Number(v).toLocaleString(),
    acres:    v => v == null ? '—' : Number(v).toFixed(3) + ' ac',
    sqft:     v => v == null ? '—' : Number(v).toLocaleString() + ' sq ft',
    currency: v => v == null ? '—' : '$' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    year:     v => v == null ? '—' : String(Math.round(v)),
    date:     v => v == null ? '—' : String(v),
  };

  /* Canonical field registry.
   * id           — key used in the normalized parcel properties object
   * label        — human-readable display name
   * type         — one of the FMT keys above
   * group        — display section in the panel
   * required     — must be present for a valid record */
  const FIELDS = [
    // identity
    { id: 'parcel_id',           label: 'Parcel ID',              type: 'string',   group: 'identity',    required: true  },
    { id: 'pin',                 label: 'PIN',                    type: 'string',   group: 'identity'                     },
    { id: 'address',             label: 'Site Address',           type: 'string',   group: 'identity'                     },
    { id: 'owner',               label: 'Owner',                  type: 'string',   group: 'identity'                     },
    { id: 'owner_mailing',       label: 'Mailing Address',        type: 'string',   group: 'identity'                     },
    // zoning
    { id: 'zoning_code',         label: 'Zoning',                 type: 'string',   group: 'zoning'                       },
    { id: 'zoning_desc',         label: 'Zoning Description',     type: 'string',   group: 'zoning'                       },
    { id: 'land_use_code',       label: 'Land Use Code',          type: 'string',   group: 'zoning'                       },
    { id: 'land_use_desc',       label: 'Land Use',               type: 'string',   group: 'zoning'                       },
    { id: 'overlay_districts',   label: 'Overlay Districts',      type: 'string',   group: 'zoning'                       },
    // physical
    { id: 'area_sqft',           label: 'Area',                   type: 'sqft',     group: 'physical'                     },
    { id: 'area_acres',          label: 'Area (acres)',           type: 'acres',    group: 'physical'                     },
    { id: 'lot_depth_ft',        label: 'Lot Depth',              type: 'number',   group: 'physical'                     },
    { id: 'lot_width_ft',        label: 'Lot Width',              type: 'number',   group: 'physical'                     },
    { id: 'building_count',      label: 'Buildings',              type: 'number',   group: 'physical'                     },
    { id: 'year_built',          label: 'Year Built',             type: 'year',     group: 'physical'                     },
    { id: 'gross_floor_area',    label: 'Gross Floor Area',       type: 'sqft',     group: 'physical'                     },
    // valuation
    { id: 'assessed_value',      label: 'Total Assessed Value',   type: 'currency', group: 'valuation'                    },
    { id: 'land_value',          label: 'Land Value',             type: 'currency', group: 'valuation'                    },
    { id: 'improvement_value',   label: 'Improvement Value',      type: 'currency', group: 'valuation'                    },
    { id: 'tax_year',            label: 'Tax Year',               type: 'year',     group: 'valuation'                    },
    { id: 'tax_amount',          label: 'Annual Tax',             type: 'currency', group: 'valuation'                    },
    // transaction
    { id: 'last_sale_date',      label: 'Last Sale Date',         type: 'date',     group: 'transaction'                  },
    { id: 'last_sale_price',     label: 'Last Sale Price',        type: 'currency', group: 'transaction'                  },
    { id: 'deed_book',           label: 'Deed Book',              type: 'string',   group: 'transaction'                  },
    { id: 'deed_page',           label: 'Deed Page',              type: 'string',   group: 'transaction'                  },
    // legal
    { id: 'subdivision',         label: 'Subdivision',            type: 'string',   group: 'legal'                        },
    { id: 'legal_desc',          label: 'Legal Description',      type: 'string',   group: 'legal'                        },
    { id: 'census_tract',        label: 'Census Tract',           type: 'string',   group: 'legal'                        },
    { id: 'county_fips',         label: 'County FIPS',            type: 'string',   group: 'legal'                        },
  ];

  const FIELD_MAP = Object.fromEntries(FIELDS.map(f => [f.id, f]));

  const GROUPS = [
    { id: 'identity',    label: 'Identification'           },
    { id: 'zoning',      label: 'Zoning & Land Use'        },
    { id: 'physical',    label: 'Physical Characteristics' },
    { id: 'valuation',   label: 'Assessed Values'          },
    { id: 'transaction', label: 'Ownership & Sales'        },
    { id: 'legal',       label: 'Legal & Administrative'   },
  ];

  function format(fieldId, value) {
    const field = FIELD_MAP[fieldId];
    if (!field) return (value == null || value === '') ? '—' : String(value);
    return (FMT[field.type] || FMT.string)(value);
  }

  function validate(props) {
    const errors = [];
    if (!props.parcel_id) errors.push('Missing required field: parcel_id');
    return errors;
  }

  return { FIELDS, FIELD_MAP, GROUPS, format, validate };
})();
