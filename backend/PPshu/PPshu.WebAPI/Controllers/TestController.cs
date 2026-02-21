using Microsoft.AspNetCore.Mvc;

namespace PPshu.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{
    [HttpGet]
    public ActionResult<TestResponse> Get()
    {
        return Ok(new TestResponse("Hello, World!", DateTime.UtcNow));
    }
    
    [HttpGet("{name}")]
    public ActionResult<TestResponse> Get(string name)
    {
        return Ok(new TestResponse($"Hello, {name}!", DateTime.UtcNow));
    }
}

public record TestResponse(string Message, DateTime Timestamp);