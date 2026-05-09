package dev.rishabkumar.talk_space.features.scheduling;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ScheduledMessageJob {

    private static final Logger log = LoggerFactory.getLogger(ScheduledMessageJob.class);

    private final ScheduledMessageService service;

    public ScheduledMessageJob(ScheduledMessageService service) {
        this.service = service;
    }

    @Scheduled(fixedDelay = 30_000)
    public void dispatchDue() {
        service.dispatchDue()
                .doOnError(e -> log.error("Error dispatching scheduled messages", e))
                .subscribe();
    }
}
