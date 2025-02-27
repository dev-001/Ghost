//@ts-check
const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:tiers');
const _ = require('lodash');

const allowedIncludes = ['monthly_price', 'yearly_price'];

module.exports = {
    browse: createSerializer('browse', paginatedTiers),
    read: createSerializer('read', singleTier),
    edit: createSerializer('edit', singleTier),
    add: createSerializer('add', singleTier)
};

/**
 * @template PageMeta
 *
 * @param {{data: import('bookshelf').Model[], meta: PageMeta}} page
 * @param {APIConfig} _apiConfig
 * @param {Frame} frame
 *
 * @returns {{tiers: SerializedTier[], meta: PageMeta}}
 */
function paginatedTiers(page, _apiConfig, frame) {
    const requestedQueryIncludes = frame.original && frame.original.query && frame.original.query.include && frame.original.query.include.split(',') || [];
    const requestedOptionsIncludes = frame.original && frame.original.options && frame.original.options.include || [];
    return {
        tiers: page.data.map((model) => {
            return cleanIncludes(
                allowedIncludes,
                requestedQueryIncludes.concat(requestedOptionsIncludes),
                serializeTier(model, frame.options, frame.apiType)
            );
        }),
        meta: page.meta
    };
}

/**
 * @param {import('bookshelf').Model} model
 * @param {APIConfig} _apiConfig
 * @param {Frame} frame
 *
 * @returns {{tiers: SerializedTier[]}}
 */
function singleTier(model, _apiConfig, frame) {
    const requestedQueryIncludes = frame.original && frame.original.query && frame.original.query.include && frame.original.query.include.split(',') || [];
    const requestedOptionsIncludes = frame.original && frame.original.options && frame.original.options.include || [];
    return {
        tiers: [
            cleanIncludes(
                allowedIncludes,
                requestedQueryIncludes.concat(requestedOptionsIncludes),
                serializeTier(model, frame.options, frame.apiType)
            )
        ]
    };
}

/**
 * @param {import('bookshelf').Model} tier
 * @param {object} options
 * @param {'content'|'admin'} apiType
 *
 * @returns {SerializedTier}
 */
function serializeTier(tier, options, apiType) {
    const json = tier.toJSON(options);

    const hideStripeData = apiType === 'content';

    const serialized = {
        id: json.id,
        name: json.name,
        description: json.description,
        slug: json.slug,
        active: json.active,
        type: json.type,
        welcome_page_url: json.welcome_page_url,
        created_at: json.created_at,
        updated_at: json.updated_at,
        stripe_prices: json.stripePrices ? json.stripePrices.map(price => serializeStripePrice(price, hideStripeData)) : null,
        monthly_price: serializeStripePrice(json.monthlyPrice, hideStripeData),
        yearly_price: serializeStripePrice(json.yearlyPrice, hideStripeData),
        benefits: json.benefits || null,
        visible: json.visible
    };

    return serialized;
}

/**
 * @param {object} data
 * @param {boolean} hideStripeData
 *
 * @returns {StripePrice}
 */
function serializeStripePrice(data, hideStripeData) {
    if (_.isEmpty(data)) {
        return null;
    }
    const price = {
        id: data.id,
        stripe_tier_id: data.stripe_product_id,
        stripe_price_id: data.stripe_price_id,
        active: data.active,
        nickname: data.nickname,
        description: data.description,
        currency: data.currency,
        amount: data.amount,
        type: data.type,
        interval: data.interval,
        created_at: data.created_at,
        updated_at: data.updated_at
    };

    if (hideStripeData) {
        delete price.stripe_price_id;
        delete price.stripe_tier_id;
    }

    return price;
}

/**
 * @template Data
 *
 * @param {string[]} allowed
 * @param {string[]} requested
 * @param {Data & Object<string, any>} data
 *
 * @returns {Data}
 */
function cleanIncludes(allowed, requested, data) {
    const cleaned = {
        ...data
    };
    for (const include of allowed) {
        if (!requested.includes(include)) {
            delete cleaned[include];
        }
    }
    return cleaned;
}

/**
 * @template Data
 * @template Response
 * @param {string} debugString
 * @param {(data: Data, apiConfig: APIConfig, frame: Frame) => Response} serialize - A function to serialize the data into an object suitable for API response
 *
 * @returns {(data: Data, apiConfig: APIConfig, frame: Frame) => void}
 */
function createSerializer(debugString, serialize) {
    return function serializer(data, apiConfig, frame) {
        debug(debugString);
        const response = serialize(data, apiConfig, frame);
        frame.response = response;
    };
}

/**
 * @typedef {Object} SerializedTier
 * @prop {string} id
 * @prop {string} name
 * @prop {string} slug
 * @prop {string} description
 * @prop {boolean} active
 * @prop {string} type
 * @prop {string} welcome_page_url
 * @prop {Date} created_at
 * @prop {Date} updated_at
 * @prop {StripePrice} [monthly_price]
 * @prop {StripePrice} [yearly_price]
 * @prop {Benefit[]} [benefits]
 */

/**
 * @typedef {object} Benefit
 * @prop {string} id
 * @prop {string} name
 * @prop {string} slug
 * @prop {Date} created_at
 * @prop {Date} updated_at
 */

/**
 * @typedef {object} StripePrice
 * @prop {string} id
 * @prop {string|null} stripe_tier_id
 * @prop {string|null} stripe_price_id
 * @prop {boolean} active
 * @prop {string} nickname
 * @prop {string} description
 * @prop {string} currency
 * @prop {number} amount
 * @prop {'recurring'|'one-time'} type
 * @prop {'day'|'week'|'month'|'year'} interval
 * @prop {Date} created_at
 * @prop {Date} updated_at
 */

/**
 * @typedef {Object} APIConfig
 * @prop {string} docName
 * @prop {string} method
 */

/**
 * @typedef {Object<string, any>} Frame
 * @prop {Object} options
 */
