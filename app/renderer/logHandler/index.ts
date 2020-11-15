import { Observable, Subscription } from 'rxjs';
import log from 'electron-log';

import { getStore } from '@shared/store';
import { Topic } from '@shared/constants/topic';

import createObservable from './observable';
import createObserver from './observer';
import { readFile, readline, filter } from './parser';
import { stateRegexes, boxRegexes } from './regex';
import config from './config';

const createPowerLogObservable = (observable: Observable<any>) => () =>
  observable
    .pipe(readFile(), readline(), filter(stateRegexes))
    .subscribe(createObserver('state'));

function startWatch() {
  const BoxSource$ = createObservable(config.heartstoneBoxLogFilePath);
  const PowerLogSource$ = createObservable(config.heartstonePowerLogFilePath);

  return BoxSource$.pipe(readFile(), readline(), filter(boxRegexes)).subscribe(
    createObserver('box', createPowerLogObservable(PowerLogSource$))
  );
}

function run() {
  const store = getStore();
  let isWatching = false;
  let subscription: Subscription;
  store.subscribe<Topic.START_WATCH>((action) => {
    if (action.type === Topic.START_WATCH) {
      if (isWatching) {
        subscription?.unsubscribe();
        isWatching = false;
      }
      subscription = startWatch();
      isWatching = true;
      log.info(`${Topic.START_WATCH} - started`);
    }
  });
}

export default run;
