package com.ssafya701.roundy.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
public class TestController {

    @GetMapping("/hello")
    public Map<String, String> hello() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "success");
        // 이 메시지를 수정하면서 브라우저에서 바귀는지 확인하세요!
        response.put("message", "Hello from WSL2 Backend!");
        return response;
    }
}
