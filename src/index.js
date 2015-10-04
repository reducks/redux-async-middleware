import isPromise from 'is-promise';
import { isRSA } from 'redux-standard-action';

const hasPromiseProps = (object) =>
  Object.keys(object).some((key) => isPromise(object[key]));

export default () => {
  return (next) => (action) => {
    if (!isRSA(action) || !hasPromiseProps(action.payload)) {
      return next(action);
    }

    const { payload, type, types, meta } = action;
    const [ PENDING, SUCCESS, FAILURE ] = types || [
      `${type}/pending`, `${type}/success`, `${type}/failure`,
    ];

    const [ promiseProps, nonPromiseProps ] = Object.keys(payload)
      .reduce(([ a, b ], key) => isPromise(payload[key]) ?
        [{ ...a, [key]: payload[key] }, b] :
        [a, { ...b, [key]: payload[key] }],
        [{}, {}]);

    next({
      type: PENDING,
      payload: nonPromiseProps,
      meta,
    });

    return Promise.all(Object.keys(promiseProps).map((key) => promiseProps[key])).then((results) =>
      Object.keys(promiseProps).reduce((output, key, index) => ({
        ...output,
        [key]: results[index],
      }), {})
    ).then(
      (results) => next({
        type: SUCCESS,
        payload: {
          ...results,
          ...nonPromiseProps,
        },
        meta,
      }),
      (error) => next({
        type: FAILURE,
        payload: error,
        error: true,
        meta: {
          ...meta,
          ...nonPromiseProps,
        },
      })
    );
  };
};
